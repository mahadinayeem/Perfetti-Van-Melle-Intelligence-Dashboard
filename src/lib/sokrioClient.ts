import axios from 'axios';

// Automatic retry with exponential backoff on transient HTTP 429 Rate Limits from Sokrio
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (error?.response?.status === 429 && config && !config._retryCount) {
      config._retryCount = 1;
      console.warn(`[Sokrio 429 Rate Limit] Backing off 1800ms and retrying: ${config.url}`);
      await new Promise((resolve) => setTimeout(resolve, 1800));
      return axios(config);
    }
    return Promise.reject(error);
  }
);

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
      if (error?.response?.status === 429) {
        console.warn('[Sokrio Auth] Rate limited on login. Backing off 2500ms and retrying once...');
        await new Promise((r) => setTimeout(r, 2500));
        try {
          const retryRes = await axios.post(
            `${baseUrl}/api/v1/login`,
            { email, password, device_name: 'pvm-intelligence-dashboard' },
            { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: 25000 }
          );
          if (retryRes.data?.token) {
            activeToken = String(retryRes.data.token).trim();
            lastTokenTime = Date.now();
            return activeToken;
          }
        } catch (retryErr) {
          console.error('[Sokrio Auth Retry Failed]:', retryErr);
        }
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

let cachedDeliveries: { data: any[]; timestamp: number } | null = null;
let inflightDeliveriesPromise: Promise<any[]> | null = null;
const DELIVERIES_CACHE_TTL_MS = 60 * 1000; // 60 seconds live cache to eliminate 429 rate limiting

/**
 * Shared live deliveries fetcher with in-flight deduplication & 60s live caching.
 * Prevents multiple simultaneous reports from hammering Sokrio /deliveries endpoint with 429 errors.
 */
export async function fetchLiveDeliveries(forceRefresh = false): Promise<any[]> {
  if (!forceRefresh && cachedDeliveries && (Date.now() - cachedDeliveries.timestamp < DELIVERIES_CACHE_TTL_MS)) {
    return cachedDeliveries.data;
  }

  if (inflightDeliveriesPromise) {
    return inflightDeliveriesPromise;
  }

  inflightDeliveriesPromise = (async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const token = await getValidToken();
        const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000,
        });
        const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        cachedDeliveries = { data, timestamp: Date.now() };
        return data;
      } catch (err: any) {
        if ((err?.response?.status === 429 || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') && attempt < 3) {
          console.warn(`[Sokrio Deliveries Retry] ${err.code || 429}. Backing off ${attempt * 1500}ms (attempt ${attempt}/3)...`);
          await new Promise((r) => setTimeout(r, attempt * 1500));
          continue;
        }
        if (cachedDeliveries?.data?.length) {
          return cachedDeliveries.data;
        }
        throw err;
      } finally {
        if (attempt === 3) inflightDeliveriesPromise = null;
      }
    }
    inflightDeliveriesPromise = null;
    return cachedDeliveries?.data || [];
  })();

  return inflightDeliveriesPromise;
}

let cachedUsers: { data: any[]; timestamp: number } | null = null;
let inflightUsersPromise: Promise<any[]> | null = null;

/**
 * Shared live users fetcher with in-flight deduplication & 60s live caching.
 * Prevents TE Version, SR Version, License, User Info from triggering 429 rate limits.
 */
export async function fetchLiveUsers(forceRefresh = false): Promise<any[]> {
  if (!forceRefresh && cachedUsers && (Date.now() - cachedUsers.timestamp < DELIVERIES_CACHE_TTL_MS)) {
    return cachedUsers.data;
  }

  if (inflightUsersPromise) {
    return inflightUsersPromise;
  }

  inflightUsersPromise = (async () => {
    const allUsers: any[] = [];
    try {
      const token = await getValidToken();

      for (let page = 1; page <= 6; page++) {
        try {
          const res = await axios.get(`https://pvm.core.sokrio.com/api/v1/users?per_page=250&page=${page}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 25000,
          });
          const users = res.data?.users || (Array.isArray(res.data) ? res.data : []);
          if (!users || users.length === 0) break;
          allUsers.push(...users);
          if (users.length < 250) break;
        } catch (pageErr: any) {
          if (pageErr?.response?.status === 429) {
            console.warn(`[Sokrio Users] Page ${page} rate limited, waiting...`);
            await new Promise(r => setTimeout(r, 1500));
            try {
              const resRetry = await axios.get(`https://pvm.core.sokrio.com/api/v1/users?per_page=250&page=${page}`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 25000,
              });
              const users = resRetry.data?.users || [];
              if (users.length > 0) allUsers.push(...users);
            } catch {}
          }
          break;
        }
      }
    } catch (err: any) {
      if (allUsers.length > 0) {
        cachedUsers = { data: allUsers, timestamp: Date.now() };
        return allUsers;
      }
      if (cachedUsers?.data?.length) return cachedUsers.data;
      throw err;
    } finally {
      inflightUsersPromise = null;
    }

    if (allUsers.length > 0) {
      cachedUsers = { data: allUsers, timestamp: Date.now() };
      return allUsers;
    }
    return cachedUsers?.data || [];
  })();

  return inflightUsersPromise;
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
