/**
 * Cookie Storage Utility
 * Migrates localStorage values to cookies and provides unified get/set operations
 * with cookie as primary source and localStorage as fallback.
 */

// Keys to migrate from localStorage to cookies
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

type CookieKey = (typeof COOKIE_KEYS)[number];

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
const getExpiryDate = (): Date => {
  const loginTimestamp = localStorage.getItem("login_timestamp");
  
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
 * Get a value from cookies with localStorage fallback
 * Cookies are the primary source; localStorage is used only if cookie is missing
 * @param key - The key to retrieve
 * @returns The value (parsed if JSON) or null
 */
export const getValue = <T = string>(key: string): T | null => {
  // Try cookie first (primary source)
  const cookieValue = getCookie(key);
  
  if (cookieValue !== null) {
    // Try to parse as JSON if it looks like JSON
    if (
      (cookieValue.startsWith("{") && cookieValue.endsWith("}")) ||
      (cookieValue.startsWith("[") && cookieValue.endsWith("]"))
    ) {
      try {
        return JSON.parse(cookieValue) as T;
      } catch {
        return cookieValue as unknown as T;
      }
    }
    return cookieValue as unknown as T;
  }
  
  // Fallback to localStorage
  const localValue = localStorage.getItem(key);
  
  if (localValue !== null) {
    // Try to parse as JSON if it looks like JSON
    if (
      (localValue.startsWith("{") && localValue.endsWith("}")) ||
      (localValue.startsWith("[") && localValue.endsWith("]"))
    ) {
      try {
        return JSON.parse(localValue) as T;
      } catch {
        return localValue as unknown as T;
      }
    }
    return localValue as unknown as T;
  }
  
  return null;
};

/**
 * Get a raw string value from cookies with localStorage fallback
 * Does not attempt JSON parsing
 * @param key - The key to retrieve
 * @returns The raw string value or null
 */
export const getRawValue = (key: string): string | null => {
  // Try cookie first (primary source)
  const cookieValue = getCookie(key);
  if (cookieValue !== null) {
    return cookieValue;
  }
  
  // Fallback to localStorage
  return localStorage.getItem(key);
};

/**
 * Set a value in both cookies and localStorage for redundancy
 * @param key - The key to set
 * @param value - The value (will be stringified if object/array)
 * @param expiryDate - Optional custom expiry date for the cookie
 */
export const setValue = (key: string, value: unknown, expiryDate?: Date): void => {
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  
  // Set in cookie (primary)
  setCookie(key, stringValue, expiryDate);
  
  // Also set in localStorage (backup)
  localStorage.setItem(key, stringValue);
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
 * Migrate localStorage values to cookies
 * Only runs once per session to avoid duplicate writes
 */
export const migrateLocalStorageToCookies = (): void => {
  // Check if migration already ran this session
  if (sessionStorage.getItem(MIGRATION_FLAG)) {
    return;
  }
  
  const expiryDate = getExpiryDate();
  
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
 * Clear all app cookies (used during logout)
 */
export const clearAllCookies = (): void => {
  for (const key of COOKIE_KEYS) {
    deleteCookie(key);
  }
  // Also clear the migration flag so it re-runs on next login
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
