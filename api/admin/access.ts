import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'node:crypto';

const json = (res: any, status: number, body: Record<string, unknown>) => {
  res.status(status).setHeader('Content-Type', 'application/json').setHeader('Cache-Control', 'no-store').json(body);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  const password = req.body?.password;
  const expected = process.env.ADMIN_ACCESS_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminUserId = process.env.ADMIN_AUTH_USER_ID;

  if (!expected || !supabaseUrl || !serviceRoleKey || !adminUserId) {
    return json(res, 503, { error: 'Administrator access is not configured.' });
  }
  if (typeof password !== 'string' || password.length < 1 || password.length > 512) {
    return json(res, 400, { error: 'Enter the admin password.' });
  }

  const clientIp = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || 'unknown')
    .split(',')[0].trim();
  const ipHash = createHash('sha256').update(serviceRoleKey).update(':').update(clientIp).digest('hex');
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: allowed, error: rateError } = await admin.rpc('admin_check_access_rate_limit', {
    p_ip_hash: ipHash,
    p_failed: false
  });
  if (rateError) {
    console.error('Admin gateway rate-limit check failed:', rateError.message);
    return json(res, 503, { error: 'Administrator access is temporarily unavailable.' });
  }
  if (!allowed) return json(res, 429, { error: 'Too many attempts. Try again later.' });

  const provided = Buffer.from(password);
  const configured = Buffer.from(expected);
  const matches = provided.length === configured.length && timingSafeEqual(provided, configured);
  if (!matches) {
    const { error } = await admin.rpc('admin_check_access_rate_limit', {
      p_ip_hash: ipHash,
      p_failed: true
    });
    if (error) console.error('Admin gateway failed-attempt record failed:', error.message);
    return json(res, 401, { error: 'Administrator sign-in failed.' });
  }

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(adminUserId);
  const user = authData?.user;
  if (authError || !user?.email) {
    console.error('Configured admin Auth user is unavailable:', authError?.message);
    return json(res, 503, { error: 'Administrator account is not configured.' });
  }

  // The configured Auth user is the sole admin identity. Grant its profile role
  // only after the shared server-side password has been validated above.
  const { data: adminProfile, error: profileError } = await admin
    .from('profiles')
    .update({ role: 'admin', updated_at: new Date().toISOString() })
    .eq('id', adminUserId)
    .select('id')
    .maybeSingle();
  if (profileError || !adminProfile) {
    console.error('Could not provision the configured admin profile:', profileError?.message);
    return json(res, 403, {
      error: profileError
        ? 'Administrator profile could not be provisioned.'
        : 'Administrator profile is missing for the configured account.'
    });
  }

  const origin = req.headers.origin;
  const appUrl = process.env.APP_URL;
  const redirectTo = appUrl ? new URL('/admin', appUrl).toString()
    : (typeof origin === 'string' && origin ? new URL('/admin', origin).toString() : undefined);
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
    options: redirectTo ? { redirectTo } : undefined
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error('Admin session link generation failed:', linkError?.message);
    return json(res, 503, { error: 'Administrator sign-in is temporarily unavailable.' });
  }

  return json(res, 200, { tokenHash });
}
