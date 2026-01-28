/**
 * Cookie Storage Utility
 * Migrates localStorage values to cookies, removes them from localStorage,
 * and provides cookie-only read/write operations.
 * 
 * NOTE: When running inside an iframe (Lovable preview), cookies may be blocked.
 * In this case, we fall back to localStorage for compatibility.
 */

// Keys to migrate from localStorage to cookies (and then remove from localStorage)
const COOKIE_KEYS = [
  "api_config",
  "auth_token",
  "login_timestamp",
  "robot_num_depths",
  "robot_num_racks",
  "robot_num_rows",
  "robot_num_slots",
  "robotname",
  "selected_rack",
  "user_id",
  "user_name",
] as const;

// Flag to track if migration has already run this session
const MIGRATION_FLAG = "__cookie_migration_done__";

// Flag to track if cookies are working
let cookiesEnabled: boolean | null = null;

/**
 * Check if cookies are enabled and working
 * Tests by setting and reading a test cookie
 */
const areCookiesEnabled = (): boolean => {
  if (cookiesEnabled !== null) {
    return cookiesEnabled;
  }
  
  try {
    // Try to set a test cookie
    const testKey = "__cookie_test__";
    const testValue = "test";
    document.cookie = `${testKey}=${testValue}; path=/; SameSite=Lax`;
    
    // Check if it was set
    const cookies = document.cookie;
    const found = cookies.includes(`${testKey}=${testValue}`);
    
    // Clean up test cookie
    document.cookie = `${testKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    
    cookiesEnabled = found;
    return found;
  } catch {
    cookiesEnabled = false;
    return false;
  }
};

/**
 * Check if running on HTTPS
 */
const isSecureContext = (): boolean => {
  return window.location.protocol === "https:";
};

/**
 * Calculate cookie expiry date
 * - If login_timestamp exists, set expiry to 24 hours from that timestamp
 * - Otherwise, default to 7 days from now
 */
const getExpiryDate = (loginTimestampValue?: string | null): Date => {
  const loginTimestamp = loginTimestampValue ?? getCookie("login_timestamp") ?? localStorage.getItem("login_timestamp");
  
  if (loginTimestamp) {
    const timestamp = parseInt(loginTimestamp, 10);
    if (!isNaN(timestamp)) {
      // 24 hours from login timestamp
      return new Date(timestamp + 24 * 60 * 60 * 1000);
    }
  }
  
  // Default: 7 days from now
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

/**
 * Set a cookie with proper configuration
 * @param name - Cookie name
 * @param value - Cookie value (will be encoded)
 * @param expiryDate - Optional custom expiry date
 */
export const setCookie = (name: string, value: string, expiryDate?: Date): void => {
  const expiry = expiryDate || getExpiryDate();
  const secure = isSecureContext() ? "; Secure" : "";
  
  // Encode the value to handle special characters and JSON
  const encodedValue = encodeURIComponent(value);
  
  document.cookie = `${name}=${encodedValue}; path=/; SameSite=Lax; expires=${expiry.toUTCString()}${secure}`;
};

/**
 * Get a cookie value by name
 * @param name - Cookie name
 * @returns The decoded cookie value or null if not found
 */
export const getCookie = (name: string): string | null => {
  try {
    const cookies = document.cookie.split(";");
    
    for (const cookie of cookies) {
      const [cookieName, ...cookieValueParts] = cookie.split("=");
      if (cookieName.trim() === name) {
        const cookieValue = cookieValueParts.join("="); // Handle values with = in them
        try {
          return decodeURIComponent(cookieValue);
        } catch {
          return cookieValue; // Return raw value if decode fails
        }
      }
    }
  } catch {
    // Cookie access failed
  }
  
  return null;
};

/**
 * Delete a cookie by name
 * @param name - Cookie name to delete
 */
export const deleteCookie = (name: string): void => {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

/**
 * Get a value - tries cookies first, falls back to localStorage if cookies are blocked
 * @param key - The key to retrieve
 * @returns The value (parsed if JSON) or null
 */
export const getValue = <T = string>(key: string): T | null => {
  let rawValue: string | null = null;
  
  // If cookies are enabled, try cookie first
  if (areCookiesEnabled()) {
    rawValue = getCookie(key);
  }
  
  // Fallback to localStorage if cookie not found or cookies disabled
  if (rawValue === null) {
    rawValue = localStorage.getItem(key);
  }
  
  if (rawValue === null) {
    return null;
  }
  
  // Try to parse as JSON if it looks like JSON
  if (
    (rawValue.startsWith("{") && rawValue.endsWith("}")) ||
    (rawValue.startsWith("[") && rawValue.endsWith("]"))
  ) {
    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return rawValue as unknown as T;
    }
  }
  
  return rawValue as unknown as T;
};

/**
 * Get a raw string value - tries cookies first, falls back to localStorage
 * Does not attempt JSON parsing
 * @param key - The key to retrieve
 * @returns The raw string value or null
 */
export const getRawValue = (key: string): string | null => {
  // If cookies are enabled, try cookie first
  if (areCookiesEnabled()) {
    const cookieValue = getCookie(key);
    if (cookieValue !== null) {
      return cookieValue;
    }
  }
  
  // Fallback to localStorage
  return localStorage.getItem(key);
};

/**
 * Set a value - stores in both cookies (if enabled) and localStorage for redundancy
 * @param key - The key to set
 * @param value - The value (will be stringified if object/array)
 * @param expiryDate - Optional custom expiry date for the cookie
 */
export const setValue = (key: string, value: unknown, expiryDate?: Date): void => {
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  
  // Always store in localStorage as reliable backup
  localStorage.setItem(key, stringValue);
  
  // Also try to store in cookie if cookies are enabled
  if (areCookiesEnabled()) {
    setCookie(key, stringValue, expiryDate);
  }
};

/**
 * Remove a value from both cookies and localStorage
 * @param key - The key to remove
 */
export const removeValue = (key: string): void => {
  deleteCookie(key);
  localStorage.removeItem(key);
};

/**
 * Migrate localStorage values to cookies (if enabled)
 * Only runs once per session to avoid duplicate writes
 */
export const migrateLocalStorageToCookies = (): void => {
  // Check if migration already ran this session
  if (sessionStorage.getItem(MIGRATION_FLAG)) {
    return;
  }
  
  // If cookies aren't enabled, skip migration but mark as done
  if (!areCookiesEnabled()) {
    sessionStorage.setItem(MIGRATION_FLAG, "true");
    return;
  }
  
  // Get login_timestamp from localStorage first (needed for expiry calculation)
  const loginTimestampFromStorage = localStorage.getItem("login_timestamp");
  const expiryDate = getExpiryDate(loginTimestampFromStorage);
  
  for (const key of COOKIE_KEYS) {
    const localValue = localStorage.getItem(key);
    
    // Only migrate if value exists in localStorage and not already in cookies
    if (localValue !== null && getCookie(key) === null) {
      setCookie(key, localValue, expiryDate);
    }
  }
  
  // Mark migration as complete for this session
  sessionStorage.setItem(MIGRATION_FLAG, "true");
};

/**
 * Clear all app cookies and localStorage values (used during logout)
 */
export const clearAllCookies = (): void => {
  for (const key of COOKIE_KEYS) {
    deleteCookie(key);
    localStorage.removeItem(key);
  }
  // Also clear the migration flag so it re-runs on next login
  sessionStorage.removeItem(MIGRATION_FLAG);
};

/**
 * Refresh cookie expiry dates (call when session is extended)
 * @param newExpiryDate - The new expiry date
 */
export const refreshCookieExpiry = (newExpiryDate?: Date): void => {
  if (!areCookiesEnabled()) {
    return;
  }
  
  const expiry = newExpiryDate || getExpiryDate();
  
  for (const key of COOKIE_KEYS) {
    const value = getCookie(key);
    if (value !== null) {
      setCookie(key, value, expiry);
    }
  }
};
