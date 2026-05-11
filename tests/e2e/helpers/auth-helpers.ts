import { randomUUID } from 'node:crypto';
import { TEST_ENV } from '../setup/test-env.ts';

export async function createTestUser(
  email?: string,
  password?: string,
) {
  const testEmail = email ?? `test-${randomUUID()}@e2e.local`;
  const testPassword = password ?? 'test-password-123!';

  // Sign up via Supabase Auth REST API
  const signUpRes = await fetch(`${TEST_ENV.SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: TEST_ENV.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const signUpData = await signUpRes.json();

  if (!signUpRes.ok) {
    throw new Error(
      `Signup failed (${signUpRes.status}): ${JSON.stringify(signUpData)}`,
    );
  }

  // For local dev, user is auto-confirmed. Get token.
  const tokenRes = await fetch(
    `${TEST_ENV.SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: TEST_ENV.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    },
  );
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    throw new Error(
      `Token fetch failed (${tokenRes.status}): ${JSON.stringify(tokenData)}`,
    );
  }

  return {
    userId: tokenData.user?.id ?? signUpData.id,
    email: testEmail,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
  };
}
