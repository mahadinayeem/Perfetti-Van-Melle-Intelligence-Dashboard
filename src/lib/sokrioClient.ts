import axios from 'axios';

// Default credentials embedded directly so Vercel deployment works with ZERO manual env config
const DEFAULT_BASE_URL = 'https://pvm.core.sokrio.com';
const DEFAULT_EMAIL = 'super@pvm.com';
const DEFAULT_PASSWORD = 'Pvm@2026@';
let activeToken = process.env.SOKRIO_TOKEN || '';
let lastTokenTime = 0;
let inflightLoginPromise: Promise<string> | null = null;

// Proactively refresh token if older than 4 hours
const TOKEN_MAX_AGE_MS = 4 * 60 * 60 * 1000;

/**
 * Perform a fresh login to Sokrio API and obtain a new Bearer token.
 * Uses in-flight deduplication so concurrent requests share a single login call.
 */
export async function loginAndGetToken(): Promise<string> {
  if (inflightLoginPromise) {
    return inflightLoginPromise;
  }

  const baseUrl = process.env.SOKRIO_BASE_URL || DEFAULT_BASE_URL;
  const email = process.env.SOKRIO_EMAIL || DEFAULT_EMAIL;
  const password = process.env.SOKRIO_PASSWORD || DEFAULT_PASSWORD;

  inflightLoginPromise = (async () => {
    try {
      console.log(`[Sokrio Auth] Requesting fresh token from ${baseUrl}/api/v1/login...`);
      const res = await axios.post(
        `${baseUrl}/api/v1/login`,
        {
          email,
          password,
          device_name: 'pvm-intelligence-dashboard',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 25000,
        }
      );

      if (res.data && res.data.token) {
        activeToken = String(res.data.token).trim();
        lastTokenTime = Date.now();
        console.log('[Sokrio Auth] Successfully acquired fresh token.');
        return activeToken;
      }
      throw new Error('Token not found in login response payload');
    } catch (error: any) {
      console.error('[Sokrio Auth Error]:', error?.response?.data || error.message);
      if (activeToken) {
        return activeToken;
      }
      throw error;
    }
  })().finally(() => {
    inflightLoginPromise = null;
  });

  return inflightLoginPromise;
}

/**
 * Returns a guaranteed valid token. If token is missing or older than 4 hours, refreshes automatically.
 */
export async function getValidToken(forceRefresh = false): Promise<string> {
  const isExpired = Date.now() - lastTokenTime > TOKEN_MAX_AGE_MS;
  if (!activeToken || isExpired || forceRefresh) {
    try {
      return await loginAndGetToken();
    } catch (e) {
      if (activeToken) return activeToken;
      throw e;
    }
  }
  return activeToken;
}

/**
 * Robust HTTP client for Sokrio API with:
 * 1. Automatic Bearer authentication
 * 2. Automatic re-login and retry on 401/403/Unauthenticated
 * 3. 45s timeout to handle heavy reporting queries
 */
export async function fetchWithAuth(url: string, params: Record<string, any> = {}) {
  let token = await getValidToken();

  const makeRequest = async (authToken: string) => {
    return await axios.get(url, {
      params,
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/json',
      },
      timeout: 45000,
    });
  };

  try {
    const response = await makeRequest(token);
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || '';

    // If unauthorized, expired, or forbidden, force a fresh login and retry once
    if (status === 401 || status === 403 || msg.toLowerCase().includes('unauthenticated')) {
      console.warn(`[Sokrio API] Token rejected (${status || msg}). Generating fresh token & retrying...`);
      token = await loginAndGetToken();
      const retryResponse = await makeRequest(token);
      return retryResponse.data;
    }

    throw error;
  }
}

/**
 * Resolves authentic PVM DB Type:
 * - SUB: Sub-distributor prefix 'SD' or 'ST' (TypeID 9)
 * - Modern Trade: '100001' (Category 11)
 * - MAIN: Main distributor (Level 6 / DepartmentType 4)
 */
export function resolveDbType(dbCode?: string | number | null): string {
  if (!dbCode) return 'MAIN';
  const s = String(dbCode).trim().toUpperCase();
  if (s.startsWith('SD') || s.startsWith('ST')) return 'SUB';
  return 'MAIN';
}
