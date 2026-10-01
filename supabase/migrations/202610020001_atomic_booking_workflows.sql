BEGIN;

-- Merchant payout details belong to the venue row, not to a customer profile.
ALTER TABLE public.gaming_cafes
  ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Payment references are customer-submitted claims; they remain pending until the venue verifies them.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS upi_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS request_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_customer_request_key_uidx
  ON public.bookings (customer_id, request_key)
  WHERE request_key IS NOT NULL;

-- Internal response helper. It returns only one booking and its own time slots.
CREATE OR REPLACE FUNCTION public.booking_rpc_result(p_booking_id TEXT)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'booking', to_jsonb(b),
    'slots', COALESCE((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.slot_date, s.start_time)
      FROM public.slots s
      WHERE s.resource_id = b.resource_id
        AND s.slot_date = b.booking_date
        AND s.start_time >= b.start_time
        AND s.start_time < b.end_time
    ), '[]'::jsonb)
  )
  FROM public.bookings b
  WHERE b.id = p_booking_id;
$$;

REVOKE ALL ON FUNCTION public.booking_rpc_result(TEXT) FROM PUBLIC, anon, authenticated;

-- Create the booking and lock every requested slot in the same database transaction.
-- No client-provided price, customer ID, or payment status is trusted.
CREATE OR REPLACE FUNCTION public.create_booking_hold(
  p_request_key UUID,
  p_venue_id TEXT,
  p_resource_id TEXT,
  p_booking_date DATE,
  p_slot_times TEXT[],
  p_offer_id TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'online'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_profile public.profiles%ROWTYPE;
  v_venue_status TEXT;
  v_venue_active BOOLEAN;
  v_venue_suspended BOOLEAN;
  v_venue_upi TEXT;
  v_venue_start TIME;
  v_venue_end TIME;
  v_operating_days TEXT[];
  v_resource_price NUMERIC(10,2);
  v_offer public.offers%ROWTYPE;
  v_slot RECORD;
  v_slot_count INTEGER;
  v_locked_count INTEGER := 0;
  v_no_show_count INTEGER := 0;
  v_active_hold_count INTEGER := 0;
  v_start_time TIME;
  v_end_time TIME;
  v_start_local TIMESTAMP WITHOUT TIME ZONE;
  v_base_amount NUMERIC(10,2);
  v_discount_amount NUMERIC(10,2) := 0;
  v_platform_fee NUMERIC(10,2) := 5.00;
  v_final_amount NUMERIC(10,2);
  v_hold_expires_at TIMESTAMPTZ;
  v_booking_id TEXT;
  v_booking_ref TEXT;
  v_existing_id TEXT;
  v_day_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in before booking.' USING ERRCODE = '42501';
  END IF;
  IF p_request_key IS NULL THEN
    RAISE EXCEPTION 'Booking request key is required.' USING ERRCODE = '22023';
  END IF;
  IF p_payment_method NOT IN ('online', 'pay_at_venue') THEN
    RAISE EXCEPTION 'This payment method is not available.' USING ERRCODE = '22023';
  END IF;
  IF p_booking_date IS NULL THEN
    RAISE EXCEPTION 'Choose a booking date.' USING ERRCODE = '22023';
  END IF;
  IF p_slot_times IS NULL OR cardinality(p_slot_times) < 1 OR cardinality(p_slot_times) > 16 THEN
    RAISE EXCEPTION 'Choose between 1 and 16 consecutive hourly slots.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(p_slot_times) AS requested(slot_time)
    WHERE requested.slot_time IS NULL OR requested.slot_time !~ '^([01][0-9]|2[0-3]):00
  ) OR cardinality(ARRAY(SELECT DISTINCT unnest(p_slot_times))) <> cardinality(p_slot_times) THEN
    RAISE EXCEPTION 'The selected slot times are invalid.' USING ERRCODE = '22023';
  END IF;

  SELECT p.* INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your account profile is not available.' USING ERRCODE = '42501';
  END IF;
  IF v_profile.is_suspended THEN
    RAISE EXCEPTION 'This account cannot create bookings.' USING ERRCODE = '42501';
  END IF;

  -- Make retries safe: the same signed-in customer and key always returns one booking.
  SELECT b.id INTO v_existing_id
  FROM public.bookings b
  WHERE b.customer_id = v_user_id
    AND b.request_key = p_request_key;
  IF FOUND THEN
    RETURN public.booking_rpc_result(v_existing_id);
  END IF;

  SELECT c.status, c.is_active, c.is_suspended, c.upi_id,
         c.operating_hours_start::TIME, c.operating_hours_end::TIME, c.operating_days,
         r.price_per_hour
  INTO v_venue_status, v_venue_active, v_venue_suspended, v_venue_upi,
       v_venue_start, v_venue_end, v_operating_days, v_resource_price
  FROM public.gaming_cafes c
  JOIN public.venue_resources r
    ON r.venue_id = c.id
   AND r.id = p_resource_id
   AND r.is_active
  WHERE c.id = p_venue_id
  FOR SHARE OF c, r;
  IF NOT FOUND OR v_venue_status <> 'approved' OR NOT v_venue_active OR v_venue_suspended THEN
    RAISE EXCEPTION 'This venue or station is not available for booking.' USING ERRCODE = 'P0001';
  END IF;
  IF p_payment_method = 'online' AND NULLIF(btrim(v_venue_upi), '') IS NULL THEN
    RAISE EXCEPTION 'This venue has not configured online payment. Choose another venue or contact it directly.' USING ERRCODE = 'P0001';
  END IF;

  v_slot_count := cardinality(p_slot_times);
  v_start_time := p_slot_times[1]::TIME;
  v_end_time := p_slot_times[v_slot_count]::TIME + INTERVAL '1 hour';
  IF v_end_time <= v_start_time OR v_start_time < v_venue_start OR v_end_time > v_venue_end THEN
    RAISE EXCEPTION 'The selected time is outside venue operating hours.' USING ERRCODE = 'P0001';
  END IF;

  FOR i IN 2..v_slot_count LOOP
    IF p_slot_times[i]::TIME <> p_slot_times[i - 1]::TIME + INTERVAL '1 hour' THEN
      RAISE EXCEPTION 'Choose consecutive hourly slots.' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  v_day_name := lower(btrim(to_char(p_booking_date, 'FMDay')));
  IF NOT EXISTS (
    SELECT 1 FROM unnest(v_operating_days) AS day_name
    WHERE lower(btrim(day_name)) = v_day_name
  ) THEN
    RAISE EXCEPTION 'The venue is closed on the selected day.' USING ERRCODE = 'P0001';
  END IF;
  IF p_booking_date < timezone('Asia/Kolkata', now())::DATE
     OR (p_booking_date + v_start_time) <= timezone('Asia/Kolkata', now()) THEN
    RAISE EXCEPTION 'Choose a future booking time.' USING ERRCODE = 'P0001';
  END IF;

  IF p_payment_method = 'pay_at_venue' THEN
    IF v_profile.pay_at_venue_blocked THEN
      RAISE EXCEPTION 'Pay at venue is disabled for this account.' USING ERRCODE = '42501';
    END IF;
    SELECT count(*) INTO v_no_show_count
    FROM public.bookings b
    WHERE b.customer_id = v_user_id
      AND b.payment_method = 'pay_at_venue'
      AND b.booking_status = 'no_show';
    IF v_no_show_count >= 3 THEN
      RAISE EXCEPTION 'Pay at venue is disabled after repeated missed bookings.' USING ERRCODE = '42501';
    END IF;
    SELECT count(*) INTO v_active_hold_count
    FROM public.bookings b
    WHERE b.customer_id = v_user_id
      AND b.payment_method = 'pay_at_venue'
      AND b.booking_status = 'held'
      AND b.hold_expires_at > now();
    IF v_active_hold_count >= 2 THEN
      RAISE EXCEPTION 'You already have the maximum number of active pay-at-venue holds.' USING ERRCODE = 'P0001';
    END IF;

    v_start_local := p_booking_date + v_start_time;
    IF v_start_local::DATE <> timezone('Asia/Kolkata', now())::DATE
       OR v_start_local < timezone('Asia/Kolkata', now())
       OR v_start_local > timezone('Asia/Kolkata', now()) + INTERVAL '2 hours' THEN
      RAISE EXCEPTION 'Pay at venue is available only for same-day sessions starting within two hours.' USING ERRCODE = 'P0001';
    END IF;
    v_hold_expires_at := (v_start_local + INTERVAL '15 minutes') AT TIME ZONE 'Asia/Kolkata';
  ELSE
    v_hold_expires_at := now() + INTERVAL '15 minutes';
  END IF;

  v_base_amount := round(v_resource_price * v_slot_count, 2);
  IF p_offer_id IS NOT NULL THEN
    SELECT o.* INTO v_offer
    FROM public.offers o
    WHERE o.id = p_offer_id
      AND o.venue_id = p_venue_id
      AND o.is_active
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'This offer is no longer available.' USING ERRCODE = 'P0001';
    END IF;
    IF v_slot_count < v_offer.min_booking_hours
       OR (v_offer.valid_from_date IS NOT NULL AND p_booking_date < v_offer.valid_from_date)
       OR (v_offer.valid_to_date IS NOT NULL AND p_booking_date > v_offer.valid_to_date)
       OR NOT EXISTS (
         SELECT 1 FROM unnest(v_offer.valid_days) AS day_name
         WHERE lower(btrim(day_name)) = v_day_name
       )
       OR (v_offer.valid_from_time IS NOT NULL AND v_start_time < v_offer.valid_from_time::TIME)
       OR (v_offer.valid_to_time IS NOT NULL AND v_end_time > v_offer.valid_to_time::TIME) THEN
      RAISE EXCEPTION 'This offer does not apply to the selected date and time.' USING ERRCODE = 'P0001';
    END IF;

    IF v_offer.discount_type = 'percentage' THEN
      v_discount_amount := floor(v_base_amount * v_offer.discount_value / 100);
      IF v_offer.max_discount_amount IS NOT NULL THEN
        v_discount_amount := least(v_discount_amount, v_offer.max_discount_amount);
      END IF;
    ELSE
      v_discount_amount := v_offer.discount_value;
    END IF;
    v_discount_amount := least(v_base_amount, greatest(0, v_discount_amount));
    UPDATE public.offers SET usage_count = usage_count + 1 WHERE id = p_offer_id;
  END IF;
  v_final_amount := greatest(0, v_base_amount - v_discount_amount) + v_platform_fee;

  -- Ensure slot rows exist even when a customer books beyond the registration seed window.
  INSERT INTO public.slots (
    id, venue_id, resource_id, slot_date, start_time, end_time,
    status, booking_id, held_until, blocked_reason, created_at, updated_at
  )
  SELECT
    'slot-' || p_resource_id || '-' || p_booking_date::TEXT || '-' || lpad(extract(hour FROM requested.slot_time::TIME)::INT::TEXT, 2, '0'),
    p_venue_id,
    p_resource_id,
    p_booking_date,
    requested.slot_time,
    to_char(requested.slot_time::TIME + INTERVAL '1 hour', 'HH24:MI'),
    'available',
    NULL,
    NULL,
    NULL,
    now(),
    now()
  FROM unnest(p_slot_times) AS requested(slot_time)
  ON CONFLICT (resource_id, slot_date, start_time) DO NOTHING;

  -- Use the same booking-then-slot lock order as cancellation and owner actions.
  FOR v_slot IN
    SELECT b.id
    FROM public.bookings b
    WHERE b.id IN (
      SELECT s.booking_id
      FROM public.slots s
      WHERE s.resource_id = p_resource_id
        AND s.slot_date = p_booking_date
        AND s.start_time = ANY(p_slot_times)
        AND s.booking_id IS NOT NULL
    )
    ORDER BY b.id
    FOR UPDATE
  LOOP
    NULL;
  END LOOP;

  FOR v_slot IN
    SELECT s.id, s.status, s.held_until, s.booking_id
    FROM public.slots s
    WHERE s.resource_id = p_resource_id
      AND s.slot_date = p_booking_date
      AND s.start_time = ANY(p_slot_times)
    ORDER BY s.start_time
    FOR UPDATE
  LOOP
    v_locked_count := v_locked_count + 1;
  END LOOP;
  IF v_locked_count <> v_slot_count THEN
    RAISE EXCEPTION 'The selected availability changed. Refresh and try again.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings b
  SET booking_status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = 'Booking hold expired',
      hold_expires_at = NULL,
      updated_at = now()
  WHERE b.id IN (
    SELECT s.booking_id
    FROM public.slots s
    WHERE s.resource_id = p_resource_id
      AND s.slot_date = p_booking_date
      AND s.start_time = ANY(p_slot_times)
      AND s.status = 'held'
      AND s.held_until <= now()
      AND s.booking_id IS NOT NULL
  )
    AND b.booking_status = 'held'
    AND b.payment_status = 'pending';

  UPDATE public.slots s
  SET status = 'available',
      booking_id = NULL,
      held_until = NULL,
      updated_at = now()
  WHERE s.resource_id = p_resource_id
    AND s.slot_date = p_booking_date
    AND s.start_time = ANY(p_slot_times)
    AND s.status = 'held'
    AND s.held_until <= now();

  IF EXISTS (
    SELECT 1 FROM public.slots s
    WHERE s.resource_id = p_resource_id
      AND s.slot_date = p_booking_date
      AND s.start_time = ANY(p_slot_times)
      AND s.status <> 'available'
  ) THEN
    RAISE EXCEPTION 'One or more selected slots were just taken. Refresh and choose another time.' USING ERRCODE = 'P0001';
  END IF;

  v_booking_id := 'book-' || replace(gen_random_uuid()::TEXT, '-', '');
  v_booking_ref := 'GARF-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 10));

  INSERT INTO public.bookings (
    id, booking_ref, customer_id, venue_id, resource_id, booking_date,
    start_time, end_time, duration_hours, base_amount, discount_amount,
    coins_used, coins_discount_amount, platform_fee, final_amount,
    payment_method, payment_status, booking_status, hold_expires_at,
    refund_amount, garf_coins_earned, offer_id, request_key, created_at, updated_at
  ) VALUES (
    v_booking_id, v_booking_ref, v_user_id, p_venue_id, p_resource_id, p_booking_date,
    to_char(v_start_time, 'HH24:MI'), to_char(v_end_time, 'HH24:MI'), v_slot_count,
    v_base_amount, v_discount_amount, 0, 0, v_platform_fee, v_final_amount,
    p_payment_method, 'pending', 'held', v_hold_expires_at,
    0, 0, p_offer_id, p_request_key, now(), now()
  );

  UPDATE public.slots s
  SET status = 'held',
      booking_id = v_booking_id,
      held_until = v_hold_expires_at,
      updated_at = now()
  WHERE s.resource_id = p_resource_id
    AND s.slot_date = p_booking_date
    AND s.start_time = ANY(p_slot_times);

  RETURN public.booking_rpc_result(v_booking_id);
END;
$$;

-- Save a customer's UPI reference but leave the booking pending until the venue checks its ledger.
CREATE OR REPLACE FUNCTION public.submit_booking_payment_reference(
  p_booking_id TEXT,
  p_upi_transaction_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to submit payment details.' USING ERRCODE = '42501';
  END IF;
  IF p_upi_transaction_id IS NULL OR p_upi_transaction_id !~ '^[A-Za-z0-9]{8,16}$' THEN
    RAISE EXCEPTION 'Enter a valid payment reference (8–16 letters or numbers).' USING ERRCODE = '22023';
  END IF;

  SELECT b.* INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id
    AND b.customer_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_booking.payment_method <> 'online'
     OR v_booking.booking_status <> 'held'
     OR v_booking.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'This booking is no longer awaiting payment verification.' USING ERRCODE = 'P0001';
  END IF;
  IF v_booking.hold_expires_at IS NULL OR v_booking.hold_expires_at <= now() THEN
    UPDATE public.bookings
    SET booking_status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'Payment verification window expired',
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = p_booking_id;
    UPDATE public.slots
    SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = p_booking_id;
    RETURN public.booking_rpc_result(p_booking_id);
  END IF;
  IF v_booking.upi_transaction_id IS NOT NULL
     AND v_booking.upi_transaction_id <> p_upi_transaction_id THEN
    RAISE EXCEPTION 'A payment reference has already been submitted for this booking.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings
  SET upi_transaction_id = p_upi_transaction_id,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

-- Only the venue owner (or an administrator) can verify the submitted reference.
CREATE OR REPLACE FUNCTION public.verify_booking_payment(
  p_booking_id TEXT,
  p_approve BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Administrator or venue-owner access is required.' USING ERRCODE = '42501';
  END IF;

  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b
  JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner_id <> v_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot verify payments for this venue.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.payment_method <> 'online'
     OR v_booking.payment_status <> 'pending'
     OR v_booking.booking_status <> 'held'
     OR v_booking.upi_transaction_id IS NULL THEN
    RAISE EXCEPTION 'This booking is not waiting for payment verification.' USING ERRCODE = 'P0001';
  END IF;

  IF v_booking.hold_expires_at IS NULL OR v_booking.hold_expires_at <= now() THEN
    UPDATE public.bookings
    SET booking_status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'Payment verification window expired',
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = p_booking_id;
    UPDATE public.slots
    SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = p_booking_id;
    RETURN public.booking_rpc_result(p_booking_id);
  END IF;

  IF p_approve THEN
    UPDATE public.bookings
    SET booking_status = 'confirmed',
        payment_status = 'completed',
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = p_booking_id;
    UPDATE public.slots
    SET status = 'booked', held_until = NULL, updated_at = now()
    WHERE booking_id = p_booking_id;
  ELSE
    UPDATE public.bookings
    SET booking_status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'Venue could not verify the submitted payment reference',
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = p_booking_id;
    UPDATE public.slots
    SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = p_booking_id;
  END IF;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

-- Customers may cancel their own booking; the venue owner may cancel only bookings at that venue.
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id TEXT,
  p_reason TEXT DEFAULT 'Cancelled by customer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in before cancelling a booking.' USING ERRCODE = '42501';
  END IF;

  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b
  JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_booking.customer_id <> v_user_id
     AND v_owner_id <> v_user_id
     AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot cancel this booking.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.booking_status NOT IN ('held', 'confirmed') THEN
    RAISE EXCEPTION 'This booking can no longer be cancelled.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = left(COALESCE(NULLIF(btrim(p_reason), ''), 'Cancelled'), 500),
      hold_expires_at = NULL,
      refund_amount = 0,
      updated_at = now()
  WHERE id = p_booking_id;
  UPDATE public.slots
  SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
  WHERE booking_id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

-- Owner-only operational transitions keep the booking and its slots in one commit.
CREATE OR REPLACE FUNCTION public.owner_check_in_booking(p_booking_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Venue-owner access is required.' USING ERRCODE = '42501';
  END IF;
  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id FOR UPDATE OF b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002'; END IF;
  IF v_owner_id <> v_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot check in this booking.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.booking_status = 'held'
     AND (v_booking.payment_method = 'online' OR v_booking.payment_status <> 'pending') THEN
    RAISE EXCEPTION 'Verify the online payment before check-in.' USING ERRCODE = 'P0001';
  END IF;
  IF v_booking.booking_status = 'held'
     AND (v_booking.hold_expires_at IS NULL OR v_booking.hold_expires_at <= now()) THEN
    UPDATE public.bookings SET booking_status = 'cancelled', cancelled_at = now(),
      cancellation_reason = 'Booking hold expired', hold_expires_at = NULL, updated_at = now()
    WHERE id = p_booking_id;
    UPDATE public.slots SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = p_booking_id;
    RETURN public.booking_rpc_result(p_booking_id);
  END IF;
  IF v_booking.booking_status NOT IN ('held', 'confirmed') THEN
    RAISE EXCEPTION 'This booking is not ready for check-in.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings SET booking_status = 'checked_in',
    payment_status = CASE WHEN payment_method = 'pay_at_venue' THEN 'completed' ELSE payment_status END,
    checked_in_at = now(), hold_expires_at = NULL, updated_at = now()
  WHERE id = p_booking_id;
  UPDATE public.slots SET status = 'booked', held_until = NULL, updated_at = now()
  WHERE booking_id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_mark_booking_no_show(p_booking_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Venue-owner access is required.' USING ERRCODE = '42501'; END IF;
  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id FOR UPDATE OF b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002'; END IF;
  IF v_owner_id <> v_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot update this booking.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.booking_status NOT IN ('held', 'confirmed') THEN
    RAISE EXCEPTION 'This booking cannot be marked as a no-show.' USING ERRCODE = 'P0001';
  END IF;
  IF (v_booking.booking_date + v_booking.start_time::TIME) >
     timezone('Asia/Kolkata', now()) THEN
    RAISE EXCEPTION 'A booking cannot be marked no-show before its start time.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings SET booking_status = 'no_show', hold_expires_at = NULL, updated_at = now()
  WHERE id = p_booking_id;
  UPDATE public.slots SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
  WHERE booking_id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_complete_booking(p_booking_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Venue-owner access is required.' USING ERRCODE = '42501'; END IF;
  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id FOR UPDATE OF b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002'; END IF;
  IF v_owner_id <> v_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot update this booking.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.booking_status <> 'checked_in' THEN
    RAISE EXCEPTION 'Only checked-in bookings can be completed.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings SET booking_status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_booking_id;
  UPDATE public.slots SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
  WHERE booking_id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_extend_booking_hold(p_booking_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
  v_new_expiry TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Venue-owner access is required.' USING ERRCODE = '42501'; END IF;
  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id FOR UPDATE OF b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002'; END IF;
  IF v_owner_id <> v_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot extend this booking hold.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.booking_status <> 'held'
     OR v_booking.hold_expires_at IS NULL
     OR v_booking.hold_expires_at <= now() THEN
    RAISE EXCEPTION 'This booking hold is no longer active.' USING ERRCODE = 'P0001';
  END IF;

  v_new_expiry := v_booking.hold_expires_at + INTERVAL '15 minutes';
  UPDATE public.bookings SET hold_expires_at = v_new_expiry, updated_at = now()
  WHERE id = p_booking_id;
  UPDATE public.slots SET held_until = v_new_expiry, updated_at = now()
  WHERE booking_id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_hold(UUID, TEXT, TEXT, DATE, TEXT[], TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_booking_payment_reference(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_booking_payment(TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_booking(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_check_in_booking(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_mark_booking_no_show(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_complete_booking(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_extend_booking_hold(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_booking_hold(UUID, TEXT, TEXT, DATE, TEXT[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_booking_payment_reference(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_booking_payment(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_check_in_booking(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_mark_booking_no_show(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_complete_booking(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_extend_booking_hold(TEXT) TO authenticated;

COMMIT;

  ) OR cardinality(ARRAY(SELECT DISTINCT unnest(p_slot_times))) <> cardinality(p_slot_times) THEN
    RAISE EXCEPTION 'The selected slot times are invalid.' USING ERRCODE = '22023';
  END IF;

  SELECT p.* INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your account profile is not available.' USING ERRCODE = '42501';
  END IF;
  IF v_profile.is_suspended THEN
    RAISE EXCEPTION 'This account cannot create bookings.' USING ERRCODE = '42501';
  END IF;

  -- Make retries safe: the same signed-in customer and key always returns one booking.
  SELECT b.id INTO v_existing_id
  FROM public.bookings b
  WHERE b.customer_id = v_user_id
    AND b.request_key = p_request_key;
  IF FOUND THEN
    RETURN public.booking_rpc_result(v_existing_id);
  END IF;

  SELECT c.status, c.is_active, c.is_suspended, c.upi_id,
         c.operating_hours_start::TIME, c.operating_hours_end::TIME, c.operating_days,
         r.price_per_hour
  INTO v_venue_status, v_venue_active, v_venue_suspended, v_venue_upi,
       v_venue_start, v_venue_end, v_operating_days, v_resource_price
  FROM public.gaming_cafes c
  JOIN public.venue_resources r
    ON r.venue_id = c.id
   AND r.id = p_resource_id
   AND r.is_active
  WHERE c.id = p_venue_id
  FOR SHARE OF c, r;
  IF NOT FOUND OR v_venue_status <> 'approved' OR NOT v_venue_active OR v_venue_suspended THEN
    RAISE EXCEPTION 'This venue or station is not available for booking.' USING ERRCODE = 'P0001';
  END IF;
  IF p_payment_method = 'online' AND NULLIF(btrim(v_venue_upi), '') IS NULL THEN
    RAISE EXCEPTION 'This venue has not configured online payment. Choose another venue or contact it directly.' USING ERRCODE = 'P0001';
  END IF;

  v_slot_count := cardinality(p_slot_times);
  v_start_time := p_slot_times[1]::TIME;
  v_end_time := p_slot_times[v_slot_count]::TIME + INTERVAL '1 hour';
  IF v_end_time <= v_start_time OR v_start_time < v_venue_start OR v_end_time > v_venue_end THEN
    RAISE EXCEPTION 'The selected time is outside venue operating hours.' USING ERRCODE = 'P0001';
  END IF;

  FOR i IN 2..v_slot_count LOOP
    IF p_slot_times[i]::TIME <> p_slot_times[i - 1]::TIME + INTERVAL '1 hour' THEN
      RAISE EXCEPTION 'Choose consecutive hourly slots.' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  v_day_name := lower(btrim(to_char(p_booking_date, 'FMDay')));
  IF NOT EXISTS (
    SELECT 1 FROM unnest(v_operating_days) AS day_name
    WHERE lower(btrim(day_name)) = v_day_name
  ) THEN
    RAISE EXCEPTION 'The venue is closed on the selected day.' USING ERRCODE = 'P0001';
  END IF;
  IF p_booking_date < timezone('Asia/Kolkata', now())::DATE THEN
    RAISE EXCEPTION 'Choose a future booking date.' USING ERRCODE = 'P0001';
  END IF;

  IF p_payment_method = 'pay_at_venue' THEN
    IF v_profile.pay_at_venue_blocked THEN
      RAISE EXCEPTION 'Pay at venue is disabled for this account.' USING ERRCODE = '42501';
    END IF;
    SELECT count(*) INTO v_no_show_count
    FROM public.bookings b
    WHERE b.customer_id = v_user_id
      AND b.payment_method = 'pay_at_venue'
      AND b.booking_status = 'no_show';
    IF v_no_show_count >= 3 THEN
      RAISE EXCEPTION 'Pay at venue is disabled after repeated missed bookings.' USING ERRCODE = '42501';
    END IF;
    SELECT count(*) INTO v_active_hold_count
    FROM public.bookings b
    WHERE b.customer_id = v_user_id
      AND b.payment_method = 'pay_at_venue'
      AND b.booking_status = 'held'
      AND b.hold_expires_at > now();
    IF v_active_hold_count >= 2 THEN
      RAISE EXCEPTION 'You already have the maximum number of active pay-at-venue holds.' USING ERRCODE = 'P0001';
    END IF;

    v_start_local := p_booking_date + v_start_time;
    IF v_start_local::DATE <> timezone('Asia/Kolkata', now())::DATE
       OR v_start_local < timezone('Asia/Kolkata', now())
       OR v_start_local > timezone('Asia/Kolkata', now()) + INTERVAL '2 hours' THEN
      RAISE EXCEPTION 'Pay at venue is available only for same-day sessions starting within two hours.' USING ERRCODE = 'P0001';
    END IF;
    v_hold_expires_at := (v_start_local + INTERVAL '15 minutes') AT TIME ZONE 'Asia/Kolkata';
  ELSE
    v_hold_expires_at := now() + INTERVAL '15 minutes';
  END IF;

  v_base_amount := round(v_resource_price * v_slot_count, 2);
  IF p_offer_id IS NOT NULL THEN
    SELECT o.* INTO v_offer
    FROM public.offers o
    WHERE o.id = p_offer_id
      AND o.venue_id = p_venue_id
      AND o.is_active
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'This offer is no longer available.' USING ERRCODE = 'P0001';
    END IF;
    IF v_slot_count < v_offer.min_booking_hours
       OR (v_offer.valid_from_date IS NOT NULL AND p_booking_date < v_offer.valid_from_date)
       OR (v_offer.valid_to_date IS NOT NULL AND p_booking_date > v_offer.valid_to_date)
       OR NOT EXISTS (
         SELECT 1 FROM unnest(v_offer.valid_days) AS day_name
         WHERE lower(btrim(day_name)) = v_day_name
       )
       OR (v_offer.valid_from_time IS NOT NULL AND v_start_time < v_offer.valid_from_time::TIME)
       OR (v_offer.valid_to_time IS NOT NULL AND v_end_time > v_offer.valid_to_time::TIME) THEN
      RAISE EXCEPTION 'This offer does not apply to the selected date and time.' USING ERRCODE = 'P0001';
    END IF;

    IF v_offer.discount_type = 'percentage' THEN
      v_discount_amount := floor(v_base_amount * v_offer.discount_value / 100);
      IF v_offer.max_discount_amount IS NOT NULL THEN
        v_discount_amount := least(v_discount_amount, v_offer.max_discount_amount);
      END IF;
    ELSE
      v_discount_amount := v_offer.discount_value;
    END IF;
    v_discount_amount := least(v_base_amount, greatest(0, v_discount_amount));
    UPDATE public.offers SET usage_count = usage_count + 1 WHERE id = p_offer_id;
  END IF;
  v_final_amount := greatest(0, v_base_amount - v_discount_amount) + v_platform_fee;

  -- Ensure slot rows exist even when a customer books beyond the registration seed window.
  INSERT INTO public.slots (
    id, venue_id, resource_id, slot_date, start_time, end_time,
    status, booking_id, held_until, blocked_reason, created_at, updated_at
  )
  SELECT
    'slot-' || p_resource_id || '-' || p_booking_date::TEXT || '-' || lpad(extract(hour FROM requested.slot_time::TIME)::INT::TEXT, 2, '0'),
    p_venue_id,
    p_resource_id,
    p_booking_date,
    requested.slot_time,
    to_char(requested.slot_time::TIME + INTERVAL '1 hour', 'HH24:MI'),
    'available',
    NULL,
    NULL,
    NULL,
    now(),
    now()
  FROM unnest(p_slot_times) AS requested(slot_time)
  ON CONFLICT (resource_id, slot_date, start_time) DO NOTHING;

  -- Lock in a stable order so simultaneous customers cannot claim the same hours.
  FOR v_slot IN
    SELECT s.id, s.status, s.held_until, s.booking_id
    FROM public.slots s
    WHERE s.resource_id = p_resource_id
      AND s.slot_date = p_booking_date
      AND s.start_time = ANY(p_slot_times)
    ORDER BY s.start_time
    FOR UPDATE
  LOOP
    v_locked_count := v_locked_count + 1;
  END LOOP;
  IF v_locked_count <> v_slot_count THEN
    RAISE EXCEPTION 'The selected availability changed. Refresh and try again.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings b
  SET booking_status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = 'Booking hold expired',
      hold_expires_at = NULL,
      updated_at = now()
  WHERE b.id IN (
    SELECT s.booking_id
    FROM public.slots s
    WHERE s.resource_id = p_resource_id
      AND s.slot_date = p_booking_date
      AND s.start_time = ANY(p_slot_times)
      AND s.status = 'held'
      AND s.held_until <= now()
      AND s.booking_id IS NOT NULL
  )
    AND b.booking_status = 'held'
    AND b.payment_status = 'pending';

  UPDATE public.slots s
  SET status = 'available',
      booking_id = NULL,
      held_until = NULL,
      updated_at = now()
  WHERE s.resource_id = p_resource_id
    AND s.slot_date = p_booking_date
    AND s.start_time = ANY(p_slot_times)
    AND s.status = 'held'
    AND s.held_until <= now();

  IF EXISTS (
    SELECT 1 FROM public.slots s
    WHERE s.resource_id = p_resource_id
      AND s.slot_date = p_booking_date
      AND s.start_time = ANY(p_slot_times)
      AND s.status <> 'available'
  ) THEN
    RAISE EXCEPTION 'One or more selected slots were just taken. Refresh and choose another time.' USING ERRCODE = 'P0001';
  END IF;

  v_booking_id := 'book-' || replace(gen_random_uuid()::TEXT, '-', '');
  v_booking_ref := 'GARF-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 10));

  INSERT INTO public.bookings (
    id, booking_ref, customer_id, venue_id, resource_id, booking_date,
    start_time, end_time, duration_hours, base_amount, discount_amount,
    coins_used, coins_discount_amount, platform_fee, final_amount,
    payment_method, payment_status, booking_status, hold_expires_at,
    refund_amount, garf_coins_earned, offer_id, request_key, created_at, updated_at
  ) VALUES (
    v_booking_id, v_booking_ref, v_user_id, p_venue_id, p_resource_id, p_booking_date,
    to_char(v_start_time, 'HH24:MI'), to_char(v_end_time, 'HH24:MI'), v_slot_count,
    v_base_amount, v_discount_amount, 0, 0, v_platform_fee, v_final_amount,
    p_payment_method, 'pending', 'held', v_hold_expires_at,
    0, 0, p_offer_id, p_request_key, now(), now()
  );

  UPDATE public.slots s
  SET status = 'held',
      booking_id = v_booking_id,
      held_until = v_hold_expires_at,
      updated_at = now()
  WHERE s.resource_id = p_resource_id
    AND s.slot_date = p_booking_date
    AND s.start_time = ANY(p_slot_times);

  RETURN public.booking_rpc_result(v_booking_id);
END;
$$;

-- Save a customer's UPI reference but leave the booking pending until the venue checks its ledger.
CREATE OR REPLACE FUNCTION public.submit_booking_payment_reference(
  p_booking_id TEXT,
  p_upi_transaction_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to submit payment details.' USING ERRCODE = '42501';
  END IF;
  IF p_upi_transaction_id IS NULL OR p_upi_transaction_id !~ '^[A-Za-z0-9]{8,16}$' THEN
    RAISE EXCEPTION 'Enter a valid payment reference (8–16 letters or numbers).' USING ERRCODE = '22023';
  END IF;

  SELECT b.* INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id
    AND b.customer_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_booking.payment_method <> 'online'
     OR v_booking.booking_status <> 'held'
     OR v_booking.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'This booking is no longer awaiting payment verification.' USING ERRCODE = 'P0001';
  END IF;
  IF v_booking.hold_expires_at IS NULL OR v_booking.hold_expires_at <= now() THEN
    UPDATE public.bookings
    SET booking_status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'Payment verification window expired',
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = p_booking_id;
    UPDATE public.slots
    SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = p_booking_id;
    RETURN public.booking_rpc_result(p_booking_id);
  END IF;
  IF v_booking.upi_transaction_id IS NOT NULL
     AND v_booking.upi_transaction_id <> p_upi_transaction_id THEN
    RAISE EXCEPTION 'A payment reference has already been submitted for this booking.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings
  SET upi_transaction_id = p_upi_transaction_id,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

-- Only the venue owner (or an administrator) can verify the submitted reference.
CREATE OR REPLACE FUNCTION public.verify_booking_payment(
  p_booking_id TEXT,
  p_approve BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Administrator or venue-owner access is required.' USING ERRCODE = '42501';
  END IF;

  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b
  JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner_id <> v_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot verify payments for this venue.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.payment_method <> 'online'
     OR v_booking.payment_status <> 'pending'
     OR v_booking.booking_status <> 'held'
     OR v_booking.upi_transaction_id IS NULL THEN
    RAISE EXCEPTION 'This booking is not waiting for payment verification.' USING ERRCODE = 'P0001';
  END IF;

  IF v_booking.hold_expires_at IS NULL OR v_booking.hold_expires_at <= now() THEN
    UPDATE public.bookings
    SET booking_status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'Payment verification window expired',
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = p_booking_id;
    UPDATE public.slots
    SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = p_booking_id;
    RETURN public.booking_rpc_result(p_booking_id);
  END IF;

  IF p_approve THEN
    UPDATE public.bookings
    SET booking_status = 'confirmed',
        payment_status = 'completed',
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = p_booking_id;
    UPDATE public.slots
    SET status = 'booked', held_until = NULL, updated_at = now()
    WHERE booking_id = p_booking_id;
  ELSE
    UPDATE public.bookings
    SET booking_status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'Venue could not verify the submitted payment reference',
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = p_booking_id;
    UPDATE public.slots
    SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = p_booking_id;
  END IF;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

-- Customers may cancel their own booking; the venue owner may cancel only bookings at that venue.
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id TEXT,
  p_reason TEXT DEFAULT 'Cancelled by customer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in before cancelling a booking.' USING ERRCODE = '42501';
  END IF;

  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b
  JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_booking.customer_id <> v_user_id
     AND v_owner_id <> v_user_id
     AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot cancel this booking.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.booking_status NOT IN ('held', 'confirmed') THEN
    RAISE EXCEPTION 'This booking can no longer be cancelled.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = left(COALESCE(NULLIF(btrim(p_reason), ''), 'Cancelled'), 500),
      hold_expires_at = NULL,
      refund_amount = 0,
      updated_at = now()
  WHERE id = p_booking_id;
  UPDATE public.slots
  SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
  WHERE booking_id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

-- Owner-only operational transitions keep the booking and its slots in one commit.
CREATE OR REPLACE FUNCTION public.owner_check_in_booking(p_booking_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Venue-owner access is required.' USING ERRCODE = '42501';
  END IF;
  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id FOR UPDATE OF b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002'; END IF;
  IF v_owner_id <> v_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot check in this booking.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.booking_status = 'held'
     AND (v_booking.payment_method = 'online' OR v_booking.payment_status <> 'pending') THEN
    RAISE EXCEPTION 'Verify the online payment before check-in.' USING ERRCODE = 'P0001';
  END IF;
  IF v_booking.booking_status = 'held'
     AND (v_booking.hold_expires_at IS NULL OR v_booking.hold_expires_at <= now()) THEN
    UPDATE public.bookings SET booking_status = 'cancelled', cancelled_at = now(),
      cancellation_reason = 'Booking hold expired', hold_expires_at = NULL, updated_at = now()
    WHERE id = p_booking_id;
    UPDATE public.slots SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
    WHERE booking_id = p_booking_id;
    RETURN public.booking_rpc_result(p_booking_id);
  END IF;
  IF v_booking.booking_status NOT IN ('held', 'confirmed') THEN
    RAISE EXCEPTION 'This booking is not ready for check-in.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings SET booking_status = 'checked_in',
    payment_status = CASE WHEN payment_method = 'pay_at_venue' THEN 'completed' ELSE payment_status END,
    checked_in_at = now(), hold_expires_at = NULL, updated_at = now()
  WHERE id = p_booking_id;
  UPDATE public.slots SET status = 'booked', held_until = NULL, updated_at = now()
  WHERE booking_id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_mark_booking_no_show(p_booking_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Venue-owner access is required.' USING ERRCODE = '42501'; END IF;
  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id FOR UPDATE OF b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002'; END IF;
  IF v_owner_id <> v_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot update this booking.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.booking_status NOT IN ('held', 'confirmed') THEN
    RAISE EXCEPTION 'This booking cannot be marked as a no-show.' USING ERRCODE = 'P0001';
  END IF;
  IF (v_booking.booking_date + v_booking.start_time::TIME) >
     timezone('Asia/Kolkata', now()) THEN
    RAISE EXCEPTION 'A booking cannot be marked no-show before its start time.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings SET booking_status = 'no_show', hold_expires_at = NULL, updated_at = now()
  WHERE id = p_booking_id;
  UPDATE public.slots SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
  WHERE booking_id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_complete_booking(p_booking_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Venue-owner access is required.' USING ERRCODE = '42501'; END IF;
  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id FOR UPDATE OF b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002'; END IF;
  IF v_owner_id <> v_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot update this booking.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.booking_status <> 'checked_in' THEN
    RAISE EXCEPTION 'Only checked-in bookings can be completed.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings SET booking_status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_booking_id;
  UPDATE public.slots SET status = 'available', booking_id = NULL, held_until = NULL, updated_at = now()
  WHERE booking_id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_extend_booking_hold(p_booking_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_owner_id TEXT;
  v_booking public.bookings%ROWTYPE;
  v_new_expiry TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Venue-owner access is required.' USING ERRCODE = '42501'; END IF;
  SELECT b, c.owner_id INTO v_booking, v_owner_id
  FROM public.bookings b JOIN public.gaming_cafes c ON c.id = b.venue_id
  WHERE b.id = p_booking_id FOR UPDATE OF b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002'; END IF;
  IF v_owner_id <> v_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'You cannot extend this booking hold.' USING ERRCODE = '42501';
  END IF;
  IF v_booking.booking_status <> 'held'
     OR v_booking.hold_expires_at IS NULL
     OR v_booking.hold_expires_at <= now() THEN
    RAISE EXCEPTION 'This booking hold is no longer active.' USING ERRCODE = 'P0001';
  END IF;

  v_new_expiry := v_booking.hold_expires_at + INTERVAL '15 minutes';
  UPDATE public.bookings SET hold_expires_at = v_new_expiry, updated_at = now()
  WHERE id = p_booking_id;
  UPDATE public.slots SET held_until = v_new_expiry, updated_at = now()
  WHERE booking_id = p_booking_id;

  RETURN public.booking_rpc_result(p_booking_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_hold(UUID, TEXT, TEXT, DATE, TEXT[], TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_booking_payment_reference(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_booking_payment(TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_booking(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_check_in_booking(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_mark_booking_no_show(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_complete_booking(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_extend_booking_hold(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_booking_hold(UUID, TEXT, TEXT, DATE, TEXT[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_booking_payment_reference(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_booking_payment(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_check_in_booking(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_mark_booking_no_show(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_complete_booking(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_extend_booking_hold(TEXT) TO authenticated;

COMMIT;
