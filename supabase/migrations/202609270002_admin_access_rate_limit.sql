-- Persistent per-IP throttling for the password-only admin gateway.
CREATE TABLE IF NOT EXISTS public.admin_access_attempts (
  ip_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0,
  blocked_until timestamptz
);

ALTER TABLE public.admin_access_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_access_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_check_access_rate_limit(
  p_ip_hash text,
  p_failed boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  attempt public.admin_access_attempts%ROWTYPE;
BEGIN
  INSERT INTO public.admin_access_attempts (ip_hash)
  VALUES (p_ip_hash)
  ON CONFLICT (ip_hash) DO NOTHING;

  SELECT * INTO attempt
  FROM public.admin_access_attempts
  WHERE ip_hash = p_ip_hash
  FOR UPDATE;

  IF attempt.blocked_until IS NOT NULL AND attempt.blocked_until > now() THEN
    RETURN false;
  END IF;

  IF attempt.window_started_at < now() - interval '15 minutes' THEN
    UPDATE public.admin_access_attempts
      SET window_started_at = now(), failed_attempts = 0, blocked_until = NULL
      WHERE ip_hash = p_ip_hash;
    attempt.failed_attempts := 0;
  END IF;

  IF p_failed THEN
    UPDATE public.admin_access_attempts
      SET failed_attempts = attempt.failed_attempts + 1,
          blocked_until = CASE WHEN attempt.failed_attempts + 1 >= 5
            THEN now() + interval '15 minutes' ELSE NULL END
      WHERE ip_hash = p_ip_hash;
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_check_access_rate_limit(text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_check_access_rate_limit(text, boolean) TO service_role;
