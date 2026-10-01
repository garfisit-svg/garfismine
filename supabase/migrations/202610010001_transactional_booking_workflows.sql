BEGIN;

-- Keep fields used by the UI in sync with the database schema.
ALTER TABLE public.gaming_cafes
  ADD COLUMN IF NOT EXISTS closed_dates text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS upi_transaction_id text;

CREATE INDEX IF NOT EXISTS bookings_held_expiration_idx
  ON public.bookings (hold_expires_at)
  WHERE booking_status = 'held' AND hold_expires_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_upi_transaction_id_unique
  ON public.bookings (lower(btrim(upi_transaction_id)))
  WHERE nullif(btrim(upi_transaction_id), '') IS NOT NULL;

-- Venue operators can see the minimum customer profile needed to manage their
-- own bookings. Customers and administrators retain their existing access.
DROP POLICY IF EXISTS profiles_read_booking_customers ON public.profiles;
CREATE POLICY profiles_read_booking_customers
  ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.gaming_cafes c ON c.id = b.venue_id
    WHERE b.customer_id = profiles.id
      AND c.owner_id = auth.uid()::text
  ));

-- Expire abandoned holds in bounded batches. Slot release and any reserved coin
-- restoration happen in the same transaction as the booking transition.
CREATE OR REPLACE FUNCTION public.expire_booking_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  expired_row public.bookings%ROWTYPE;
  restored_balance integer;
  expired_count integer := 0;
BEGIN
  FOR expired_row IN
    SELECT *
    FROM public.bookings
    WHERE booking_status = 'held'
      AND payment_status = 'pending'
      AND hold_expires_at IS NOT NULL
      AND upi_transaction_id IS NULL
      AND hold_expires_at <= now()
    ORDER BY hold_expires_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT 250
  LOOP
    UPDATE public.bookings
    SET booking_status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = COALESCE(cancellation_reason, 'Booking hold expired'),
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = expired_row.id;

    UPDATE public.slots
    SET status = 'available',
        booking_id = NULL,
        held_until = NULL,
        updated_at = now()
    WHERE booking_id = expired_row.id
      AND status = 'held';

    IF expired_row.coins_used > 0 THEN
      UPDATE public.profiles
      SET garf_coins = garf_coins + expired_row.coins_used,
          updated_at = now()
      WHERE id = expired_row.customer_id
      RETURNING garf_coins INTO restored_balance;

      IF FOUND THEN
        INSERT INTO public.coin_transactions
          (id, user_id, amount, type, description, reference_id, balance_after)
        VALUES
          ('txn-exp-' || replace(gen_random_uuid()::text, '-', ''),
           expired_row.customer_id,
           expired_row.coins_used,
           'cancellation_restore',
           'Coins restored after an expired booking hold ' || expired_row.booking_ref,
           expired_row.id,
           restored_balance);
      END IF;
    END IF;

    expired_count := expired_count + 1;
  END LOOP;

  RETURN expired_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_booking_holds() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_booking_holds() TO authenticated;

-- Create the hold and reserve the chosen slots and coins atomically. The
-- resource/date advisory lock serializes concurrent attempts for the same unit.
CREATE OR REPLACE FUNCTION public.create_booking_hold(
  p_venue_id text,
  p_resource_id text,
  p_booking_date date,
  p_slot_times text[],
  p_coins_requested integer DEFAULT 0,
  p_offer_id text DEFAULT NULL,
  p_payment_method text DEFAULT 'online'
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id text := auth.uid()::text;
  profile_row public.profiles%ROWTYPE;
  venue_row public.gaming_cafes%ROWTYPE;
  resource_row public.venue_resources%ROWTYPE;
  offer_row public.offers%ROWTYPE;
  booking_row public.bookings%ROWTYPE;
  slot_start time;
  slot_end time;
  previous_slot time;
  booking_start timestamptz;
  hold_expiry timestamptz;
  duration integer;
  base_amount numeric(10,2);
  discount_amount numeric(10,2) := 0;
  net_amount numeric(10,2);
  coins_to_use integer := 0;
  final_amount numeric(10,2);
  booking_id text;
  booking_ref text;
  i integer;
  available_count integer;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to create a booking.';
  END IF;
  IF p_payment_method NOT IN ('online', 'pay_at_venue', 'token_advance') THEN
    RAISE EXCEPTION 'Unsupported payment method.';
  END IF;
  IF p_slot_times IS NULL OR cardinality(p_slot_times) < 1 OR cardinality(p_slot_times) > 12 THEN
    RAISE EXCEPTION 'Choose between 1 and 12 consecutive hours.';
  END IF;

  PERFORM public.expire_booking_holds();

  PERFORM pg_advisory_xact_lock(hashtextextended(p_resource_id || ':' || p_booking_date::text, 0));

  SELECT * INTO profile_row
  FROM public.profiles
  WHERE id = actor_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your account profile is unavailable. Sign in again.';
  END IF;
  IF profile_row.is_suspended THEN
    RAISE EXCEPTION 'This account cannot create bookings.';
  END IF;

  SELECT * INTO venue_row
  FROM public.gaming_cafes
  WHERE id = p_venue_id
  FOR SHARE;
  IF NOT FOUND OR venue_row.status <> 'approved' OR NOT venue_row.is_active OR venue_row.is_suspended THEN
    RAISE EXCEPTION 'This venue is not currently accepting bookings.';
  END IF;
  IF venue_row.closed_dates @> ARRAY[p_booking_date::text] THEN
    RAISE EXCEPTION 'This venue is closed on the selected date.';
  END IF;
  IF cardinality(venue_row.operating_days) > 0
     AND NOT EXISTS (
       SELECT 1 FROM unnest(venue_row.operating_days) day_name
       WHERE lower(btrim(day_name)) = lower(to_char(p_booking_date, 'FMDay'))
     ) THEN
    RAISE EXCEPTION 'This venue is closed on the selected day.';
  END IF;

  SELECT * INTO resource_row
  FROM public.venue_resources
  WHERE id = p_resource_id
    AND venue_id = p_venue_id
    AND is_active
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This resource is unavailable.';
  END IF;

  duration := cardinality(p_slot_times);
  previous_slot := NULL;
  FOR i IN 1..duration LOOP
    IF p_slot_times[i] !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' THEN
      RAISE EXCEPTION 'The selected time is invalid.';
    END IF;
    slot_start := p_slot_times[i]::time;
    IF previous_slot IS NOT NULL AND slot_start <> previous_slot + interval '1 hour' THEN
      RAISE EXCEPTION 'Selected hours must be consecutive.';
    END IF;
    previous_slot := slot_start;
  END LOOP;

  slot_start := p_slot_times[1]::time;
  IF extract(epoch FROM slot_start) / 60 + duration * 60
       > extract(epoch FROM venue_row.operating_hours_end::time) / 60
     OR slot_start < venue_row.operating_hours_start::time THEN
    RAISE EXCEPTION 'The selected time is outside the venue operating hours.';
  END IF;
  slot_end := CASE
    WHEN extract(epoch FROM slot_start) / 60 + duration * 60 >= 1440 THEN '24:00'::time
    ELSE slot_start + make_interval(hours => duration)
  END;

  booking_start := (p_booking_date + slot_start) AT TIME ZONE 'Asia/Kolkata';
  IF booking_start <= now() THEN
    RAISE EXCEPTION 'The selected session has already started.';
  END IF;

  IF p_payment_method = 'pay_at_venue' THEN
    IF profile_row.pay_at_venue_blocked OR profile_row.no_show_count >= 3 THEN
      RAISE EXCEPTION 'Pay at venue is disabled for this account.';
    END IF;
    IF (now() AT TIME ZONE 'Asia/Kolkata')::date <> p_booking_date
       OR booking_start - now() > interval '2 hours' THEN
      RAISE EXCEPTION 'Pay at venue is available for same-day sessions starting within two hours.';
    END IF;
    IF (
      SELECT count(*) FROM public.bookings
      WHERE customer_id = actor_id
        AND booking_status = 'held'
        AND payment_method = 'pay_at_venue'
        AND hold_expires_at > now()
    ) >= 2 THEN
      RAISE EXCEPTION 'You can have at most two active pay-at-venue holds.';
    END IF;
    hold_expiry := booking_start + interval '15 minutes';
  ELSE
    hold_expiry := now() + interval '5 minutes';
  END IF;

  -- Reject bookings that overlap a checked-in or confirmed reservation, even
  -- if it was created outside the hourly slot flow.
  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.resource_id = p_resource_id
      AND b.booking_date = p_booking_date
      AND b.booking_status IN ('held', 'confirmed', 'checked_in')
      AND (b.booking_status <> 'held' OR b.upi_transaction_id IS NOT NULL OR b.hold_expires_at > now())
      AND b.start_time::time < slot_end
      AND b.end_time::time > slot_start
  ) THEN
    RAISE EXCEPTION 'That resource is already reserved for part of the selected time.';
  END IF;

  PERFORM 1
  FROM public.slots
  WHERE resource_id = p_resource_id
    AND venue_id = p_venue_id
    AND slot_date = p_booking_date
    AND start_time = ANY(p_slot_times)
  ORDER BY start_time
  FOR UPDATE;

  SELECT count(*) INTO available_count
  FROM public.slots
  WHERE resource_id = p_resource_id
    AND venue_id = p_venue_id
    AND slot_date = p_booking_date
    AND start_time = ANY(p_slot_times)
    AND status = 'available';

  IF available_count <> duration THEN
    RAISE EXCEPTION 'One or more selected hours are no longer available. Refresh and choose again.';
  END IF;

  base_amount := resource_row.price_per_hour * duration;

  IF p_offer_id IS NOT NULL THEN
    SELECT * INTO offer_row
    FROM public.offers
    WHERE id = p_offer_id
      AND venue_id = p_venue_id
      AND is_active
    FOR SHARE;
    IF NOT FOUND
       OR duration < offer_row.min_booking_hours
       OR NOT EXISTS (SELECT 1 FROM unnest(offer_row.valid_days) d WHERE lower(btrim(d)) = lower(to_char(p_booking_date, 'FMDay')))
       OR (offer_row.valid_from_date IS NOT NULL AND p_booking_date < offer_row.valid_from_date)
       OR (offer_row.valid_to_date IS NOT NULL AND p_booking_date > offer_row.valid_to_date)
       OR (offer_row.valid_from_time IS NOT NULL AND slot_start < offer_row.valid_from_time::time)
       OR (offer_row.valid_to_time IS NOT NULL AND slot_end > offer_row.valid_to_time::time) THEN
      RAISE EXCEPTION 'The selected offer is no longer valid.';
    END IF;

    IF offer_row.discount_type = 'percentage' THEN
      discount_amount := floor(base_amount * offer_row.discount_value / 100);
      IF offer_row.max_discount_amount IS NOT NULL THEN
        discount_amount := least(discount_amount, offer_row.max_discount_amount);
      END IF;
    ELSE
      discount_amount := least(base_amount, offer_row.discount_value);
    END IF;
  END IF;

  net_amount := greatest(0, base_amount - discount_amount);
  coins_to_use := least(
    greatest(coalesce(p_coins_requested, 0), 0),
    profile_row.garf_coins,
    floor(net_amount * 0.5)::integer
  );
  final_amount := greatest(0, net_amount - coins_to_use + 5);

  booking_id := 'book-' || replace(gen_random_uuid()::text, '-', '');
  booking_ref := 'GARF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.bookings (
    id, booking_ref, customer_id, venue_id, resource_id, booking_date,
    start_time, end_time, duration_hours, base_amount, discount_amount,
    coins_used, coins_discount_amount, platform_fee, final_amount,
    payment_method, payment_status, booking_status, hold_expires_at,
    checked_in_at, completed_at, cancelled_at, cancellation_reason,
    refund_amount, garf_coins_earned, offer_id, walk_in_customer_name,
    walk_in_customer_phone, quantity, created_at, updated_at
  ) VALUES (
    booking_id, booking_ref, actor_id, p_venue_id, p_resource_id, p_booking_date,
    p_slot_times[1], to_char(slot_end, 'HH24:MI'), duration, base_amount, discount_amount,
    coins_to_use, coins_to_use, 5, final_amount,
    p_payment_method, 'pending', 'held', hold_expiry,
    NULL, NULL, NULL, NULL, 0, 0, p_offer_id, NULL, NULL, 1, now(), now()
  )
  RETURNING * INTO booking_row;

  UPDATE public.slots
  SET status = 'held',
      booking_id = booking_row.id,
      held_until = hold_expiry,
      updated_at = now()
  WHERE resource_id = p_resource_id
    AND venue_id = p_venue_id
    AND slot_date = p_booking_date
    AND start_time = ANY(p_slot_times);

  IF coins_to_use > 0 THEN
    UPDATE public.profiles
    SET garf_coins = garf_coins - coins_to_use,
        updated_at = now()
    WHERE id = actor_id
    RETURNING garf_coins INTO profile_row.garf_coins;

    INSERT INTO public.coin_transactions
      (id, user_id, amount, type, description, reference_id, balance_after)
    VALUES
      ('txn-book-' || replace(gen_random_uuid()::text, '-', ''),
       actor_id,
       -coins_to_use,
       'redemption',
       'Reserved coins for booking ' || booking_row.booking_ref,
       booking_row.id,
       profile_row.garf_coins);
  END IF;

  RETURN booking_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_hold(text, text, date, text[], integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_hold(text, text, date, text[], integer, text, text) TO authenticated;

-- Store a transaction reference without pretending the transfer was verified.
-- A submitted reference gives the owner time to check their payment ledger.
CREATE OR REPLACE FUNCTION public.submit_booking_payment(
  p_booking_id text,
  p_upi_transaction_id text
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id text := auth.uid()::text;
  booking_row public.bookings%ROWTYPE;
  transaction_ref text;
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Sign in to submit payment details.'; END IF;
  transaction_ref := regexp_replace(btrim(coalesce(p_upi_transaction_id, '')), '\s+', '', 'g');
  IF length(transaction_ref) < 8 OR length(transaction_ref) > 100 THEN
    RAISE EXCEPTION 'Enter a valid UPI transaction reference.';
  END IF;

  SELECT * INTO booking_row
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND OR booking_row.customer_id <> actor_id THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;
  IF booking_row.payment_method NOT IN ('online', 'token_advance')
     OR booking_row.booking_status <> 'held'
     OR booking_row.payment_status <> 'pending'
     OR (booking_row.upi_transaction_id IS NULL
         AND (booking_row.hold_expires_at IS NULL OR booking_row.hold_expires_at <= now())) THEN
    RAISE EXCEPTION 'This booking hold has expired or cannot accept payment details.';
  END IF;
  IF booking_row.upi_transaction_id IS NOT NULL
     AND lower(btrim(booking_row.upi_transaction_id)) <> lower(transaction_ref) THEN
    RAISE EXCEPTION 'A payment reference was already submitted for this booking.';
  END IF;

  UPDATE public.bookings
  SET upi_transaction_id = transaction_ref,
      hold_expires_at = NULL,
      updated_at = now()
  WHERE id = booking_row.id
  RETURNING * INTO booking_row;

  UPDATE public.slots
  SET held_until = NULL,
      updated_at = now()
  WHERE booking_id = booking_row.id
    AND status = 'held';

  RETURN booking_row;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_booking_payment(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_booking_payment(text, text) TO authenticated;

-- Only the venue operator or a provisioned administrator can verify a UPI
-- reference and convert a hold into a confirmed booking.
CREATE OR REPLACE FUNCTION public.verify_booking_payment(p_booking_id text)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id text := auth.uid()::text;
  booking_row public.bookings%ROWTYPE;
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Sign in to verify payment.'; END IF;
  SELECT * INTO booking_row
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.'; END IF;
  IF NOT public.is_current_user_admin()
     AND NOT EXISTS (
       SELECT 1 FROM public.gaming_cafes c
       WHERE c.id = booking_row.venue_id AND c.owner_id = actor_id
     ) THEN
    RAISE EXCEPTION 'You are not allowed to verify this booking.';
  END IF;
  IF booking_row.booking_status = 'confirmed' AND booking_row.payment_status = 'completed' THEN
    RETURN booking_row;
  END IF;
  IF booking_row.payment_method NOT IN ('online', 'token_advance')
     OR booking_row.booking_status <> 'held'
     OR booking_row.payment_status <> 'pending'
     OR nullif(btrim(booking_row.upi_transaction_id), '') IS NULL
     OR booking_row.hold_expires_at IS NULL
     OR booking_row.hold_expires_at <= now() THEN
    RAISE EXCEPTION 'This booking has no verifiable active payment reference.';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'confirmed',
      payment_status = 'completed',
      hold_expires_at = NULL,
      advance_paid_amount = CASE
        WHEN payment_method = 'token_advance' THEN round(final_amount * 0.3)
        ELSE 0
      END,
      updated_at = now()
  WHERE id = booking_row.id
  RETURNING * INTO booking_row;

  UPDATE public.slots
  SET status = 'booked',
      held_until = NULL,
      updated_at = now()
  WHERE booking_id = booking_row.id;

  RETURN booking_row;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_booking_payment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_booking_payment(text) TO authenticated;

-- Customer cancellation and venue release both use this transaction. A manual
-- UPI transfer is outside GARF, so this intentionally does not claim to issue a
-- refund; the venue must handle any transfer already received.
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id text,
  p_reason text DEFAULT 'Cancelled by customer'
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id text := auth.uid()::text;
  booking_row public.bookings%ROWTYPE;
  venue_owner_id text;
  restored_balance integer;
  reason_text text := left(coalesce(nullif(btrim(p_reason), ''), 'Booking cancelled'), 500);
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Sign in to cancel this booking.'; END IF;
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.'; END IF;
  SELECT owner_id INTO venue_owner_id FROM public.gaming_cafes WHERE id = booking_row.venue_id;
  IF booking_row.customer_id <> actor_id
     AND venue_owner_id <> actor_id
     AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You are not allowed to cancel this booking.';
  END IF;
  IF booking_row.booking_status NOT IN ('held', 'confirmed') THEN
    RAISE EXCEPTION 'This booking can no longer be cancelled.';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = reason_text,
      hold_expires_at = NULL,
      refund_amount = 0,
      updated_at = now()
  WHERE id = booking_row.id
  RETURNING * INTO booking_row;

  UPDATE public.slots
  SET status = 'available',
      booking_id = NULL,
      held_until = NULL,
      updated_at = now()
  WHERE booking_id = booking_row.id;

  IF booking_row.payment_status = 'pending' AND booking_row.coins_used > 0 THEN
    UPDATE public.profiles
    SET garf_coins = garf_coins + booking_row.coins_used,
        updated_at = now()
    WHERE id = booking_row.customer_id
    RETURNING garf_coins INTO restored_balance;

    IF FOUND THEN
      INSERT INTO public.coin_transactions
        (id, user_id, amount, type, description, reference_id, balance_after)
      VALUES
        ('txn-can-' || replace(gen_random_uuid()::text, '-', ''),
         booking_row.customer_id,
         booking_row.coins_used,
         'cancellation_restore',
         'Coins restored after cancelling booking ' || booking_row.booking_ref,
         booking_row.id,
         restored_balance);
    END IF;
  END IF;

  RETURN booking_row;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_booking(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(text, text) TO authenticated;

-- Owner workflows are constrained transitions rather than unrestricted client
-- updates to booking rows.
CREATE OR REPLACE FUNCTION public.owner_booking_action(
  p_booking_id text,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id text := auth.uid()::text;
  booking_row public.bookings%ROWTYPE;
  venue_owner_id text;
  customer_balance integer;
  new_no_show_count integer;
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Sign in to update this booking.'; END IF;
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.'; END IF;
  SELECT owner_id INTO venue_owner_id FROM public.gaming_cafes WHERE id = booking_row.venue_id;
  IF venue_owner_id <> actor_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You are not allowed to manage this booking.';
  END IF;

  IF p_action = 'check_in' THEN
    IF NOT (
      (booking_row.booking_status = 'confirmed' AND booking_row.payment_status = 'completed')
      OR (booking_row.booking_status = 'held'
          AND booking_row.payment_method = 'pay_at_venue'
          AND booking_row.hold_expires_at > now())
    ) THEN
      RAISE EXCEPTION 'Only a paid booking or an active pay-at-venue hold can be checked in.';
    END IF;
    UPDATE public.bookings
    SET booking_status = 'checked_in',
        payment_status = CASE WHEN payment_method = 'pay_at_venue' THEN 'completed' ELSE payment_status END,
        checked_in_at = now(),
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = booking_row.id
    RETURNING * INTO booking_row;
    UPDATE public.slots SET status = 'booked', held_until = NULL, updated_at = now()
    WHERE booking_id = booking_row.id;

  ELSIF p_action = 'no_show' THEN
    IF booking_row.booking_status NOT IN ('held', 'confirmed')
       OR (booking_row.booking_status = 'held' AND booking_row.payment_method <> 'pay_at_venue') THEN
      RAISE EXCEPTION 'This booking cannot be marked as a no-show.';
    END IF;
    IF now() < ((booking_row.booking_date + booking_row.start_time::time) AT TIME ZONE 'Asia/Kolkata') + interval '15 minutes' THEN
      RAISE EXCEPTION 'A customer can only be marked as a no-show after the 15-minute arrival grace period.';
    END IF;
    UPDATE public.bookings
    SET booking_status = 'no_show',
        cancelled_at = now(),
        cancellation_reason = COALESCE(NULLIF(btrim(p_reason), ''), 'Customer did not arrive'),
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = booking_row.id
    RETURNING * INTO booking_row;
    UPDATE public.slots SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = booking_row.id;
    IF booking_row.payment_status = 'pending' AND booking_row.coins_used > 0 THEN
      UPDATE public.profiles SET garf_coins = garf_coins + booking_row.coins_used, updated_at = now()
      WHERE id = booking_row.customer_id
      RETURNING garf_coins INTO customer_balance;
      IF FOUND THEN
        INSERT INTO public.coin_transactions
          (id, user_id, amount, type, description, reference_id, balance_after)
        VALUES
          ('txn-noshow-' || replace(gen_random_uuid()::text, '-', ''),
           booking_row.customer_id, booking_row.coins_used, 'cancellation_restore',
           'Coins restored after an unpaid no-show booking ' || booking_row.booking_ref,
           booking_row.id, customer_balance);
      END IF;
    END IF;
    UPDATE public.profiles
    SET no_show_count = no_show_count + 1,
        pay_at_venue_blocked = (no_show_count + 1) >= 3,
        updated_at = now()
    WHERE id = booking_row.customer_id;

  ELSIF p_action = 'complete' THEN
    IF booking_row.booking_status <> 'checked_in' THEN
      RAISE EXCEPTION 'Only a checked-in session can be completed.';
    END IF;
    UPDATE public.bookings
    SET booking_status = 'completed',
        completed_at = now(),
        updated_at = now()
    WHERE id = booking_row.id
    RETURNING * INTO booking_row;
    UPDATE public.slots SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = booking_row.id;

  ELSIF p_action = 'extend_hold' THEN
    IF booking_row.booking_status <> 'held'
       OR booking_row.payment_method <> 'pay_at_venue'
       OR booking_row.hold_expires_at IS NULL
       OR booking_row.hold_expires_at <= now() THEN
      RAISE EXCEPTION 'Only an active pay-at-venue hold can be extended.';
    END IF;
    UPDATE public.bookings
    SET hold_expires_at = hold_expires_at + interval '15 minutes',
        updated_at = now()
    WHERE id = booking_row.id
    RETURNING * INTO booking_row;
    UPDATE public.slots SET held_until = booking_row.hold_expires_at, updated_at = now()
    WHERE booking_id = booking_row.id AND status = 'held';

  ELSIF p_action = 'release_hold' THEN
    IF booking_row.booking_status <> 'held' THEN
      RAISE EXCEPTION 'Only an active hold can be released.';
    END IF;
    UPDATE public.bookings
    SET booking_status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = COALESCE(NULLIF(btrim(p_reason), ''), 'Released by venue manager'),
        hold_expires_at = NULL,
        refund_amount = 0,
        updated_at = now()
    WHERE id = booking_row.id
    RETURNING * INTO booking_row;
    UPDATE public.slots SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = booking_row.id;
    IF booking_row.payment_status = 'pending' AND booking_row.coins_used > 0 THEN
      UPDATE public.profiles SET garf_coins = garf_coins + booking_row.coins_used, updated_at = now()
      WHERE id = booking_row.customer_id
      RETURNING garf_coins INTO customer_balance;
      IF FOUND THEN
        INSERT INTO public.coin_transactions
          (id, user_id, amount, type, description, reference_id, balance_after)
        VALUES
          ('txn-release-' || replace(gen_random_uuid()::text, '-', ''),
           booking_row.customer_id, booking_row.coins_used, 'cancellation_restore',
           'Coins restored after a venue released booking ' || booking_row.booking_ref,
           booking_row.id, customer_balance);
      END IF;
    END IF;

  ELSE
    RAISE EXCEPTION 'Unsupported booking action.';
  END IF;

  RETURN booking_row;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_booking_action(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_booking_action(text, text, text) TO authenticated;

COMMIT;
