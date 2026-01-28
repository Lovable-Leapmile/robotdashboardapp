/**
 * Cookie Storage Utility
 * Migrates localStorage values to cookies (one-time), removes them from localStorage,
 * and provides cookie-only read/write operations.
 * 
 * IMPORTANT: Cookies are the SINGLE SOURCE OF TRUTH.
 * NO localStorage fallback is used after migration.
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
  "camera_filter_preference",
] as const;

// Flag to track if migration has already run this session
const MIGRATION_FLAG = "__cookie_migration_done__";

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
  const loginTimestamp = loginTimestampValue ?? getCookie("login_timestamp");
  
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
 * Get a value from cookies ONLY (no localStorage fallback)
 * Cookies are the single source of truth.
 * @param key - The key to retrieve
 * @returns The value (parsed if JSON) or null
 */
export const getValue = <T = string>(key: string): T | null => {
  const rawValue = getCookie(key);
  
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
 * Get a raw string value from cookies ONLY (no localStorage fallback)
 * Does not attempt JSON parsing
 * @param key - The key to retrieve
 * @returns The raw string value or null
 */
export const getRawValue = (key: string): string | null => {
  return getCookie(key);
};

/**
 * Set a value in cookies ONLY (no localStorage)
 * @param key - The key to set
 * @param value - The value (will be stringified if object/array)
 * @param expiryDate - Optional custom expiry date for the cookie
 */
export const setValue = (key: string, value: unknown, expiryDate?: Date): void => {
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  setCookie(key, stringValue, expiryDate);
};

/**
 * Remove a value from cookies ONLY
 * @param key - The key to remove
 */
export const removeValue = (key: string): void => {
  deleteCookie(key);
};

/**
 * Migrate localStorage values to cookies (one-time operation)
 * After migration, removes values from localStorage.
 * Only runs once per session to avoid duplicate writes.
 */
export const migrateLocalStorageToCookies = (): void => {
  // Check if migration already ran this session
  if (sessionStorage.getItem(MIGRATION_FLAG)) {
    return;
  }
  
  try {
    // Get login_timestamp from localStorage first (needed for expiry calculation)
    const loginTimestampFromStorage = localStorage.getItem("login_timestamp");
    const expiryDate = getExpiryDate(loginTimestampFromStorage);
    
    for (const key of COOKIE_KEYS) {
      const localValue = localStorage.getItem(key);
      
      // Only migrate if value exists in localStorage and not already in cookies
      if (localValue !== null && getCookie(key) === null) {
        setCookie(key, localValue, expiryDate);
      }
      
      // Remove from localStorage after migration (cookies are now single source of truth)
      if (localValue !== null) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    // localStorage might be blocked in some environments, silently fail
    console.warn("Migration from localStorage failed:", error);
  }
  
  // Mark migration as complete for this session
  sessionStorage.setItem(MIGRATION_FLAG, "true");
};

/**
 * Clear all app cookies (used during logout)
 * Also clears any remaining localStorage values for clean state
 */
export const clearAllCookies = (): void => {
  for (const key of COOKIE_KEYS) {
    deleteCookie(key);
  }
  
  // Also clear localStorage for complete cleanup
  try {
    for (const key of COOKIE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // localStorage might be blocked
  }
  
  // Clear the migration flag so it re-runs on next login if needed
  sessionStorage.removeItem(MIGRATION_FLAG);
};

/**
 * Refresh cookie expiry dates (call when session is extended)
 * @param newExpiryDate - The new expiry date
 */
export const refreshCookieExpiry = (newExpiryDate?: Date): void => {
  const expiry = newExpiryDate || getExpiryDate();
  
  for (const key of COOKIE_KEYS) {
    const value = getCookie(key);
    if (value !== null) {
      setCookie(key, value, expiry);
    }
  }
};
