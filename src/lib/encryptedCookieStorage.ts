/**
 * Encrypted Cookie Storage Utility
 * Provides encrypted cookie-based storage with automatic migration from localStorage
 */

import { encrypt, decrypt, isEncrypted } from "./encryption";

// Keys that should be migrated from localStorage to encrypted cookies
const MIGRATABLE_KEYS = [
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

type StorageKey = (typeof MIGRATABLE_KEYS)[number] | string;

// Session duration: 7 days
const SESSION_DURATION_DAYS = 7;

/**
 * Calculate cookie expiry based on login_timestamp or default to 7 days
 */
const getCookieExpiry = (): Date => {
  const loginTimestamp = getCookieValue("login_timestamp");
  if (loginTimestamp) {
    try {
      const timestamp = parseInt(decrypt(loginTimestamp), 10);
      // 24 hours from login timestamp
      return new Date(timestamp + 24 * 60 * 60 * 1000);
    } catch {
      // Fallback to 7 days
    }
  }
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
};

/**
 * Get raw cookie value without decryption
 */
const getCookieValue = (key: string): string | null => {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [cookieKey, ...valueParts] = cookie.split("=");
    if (cookieKey.trim() === key) {
      return valueParts.join("=").trim() || null;
    }
  }
  return null;
};

/**
 * Set a cookie with proper options
 */
const setCookie = (
  key: string,
  value: string,
  options?: { expires?: Date; path?: string; sameSite?: string; secure?: boolean }
): void => {
  const expiry = options?.expires || getCookieExpiry();
  const path = options?.path || "/";
  const sameSite = options?.sameSite || "Lax";
  const secure = options?.secure ?? (window.location.protocol === "https:");

  let cookieString = `${key}=${encodeURIComponent(value)}`;
  cookieString += `; expires=${expiry.toUTCString()}`;
  cookieString += `; path=${path}`;
  cookieString += `; SameSite=${sameSite}`;
  if (secure) {
    cookieString += "; Secure";
  }

  document.cookie = cookieString;
};

/**
 * Delete a cookie
 */
const deleteCookie = (key: string): void => {
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

/**
 * Set an encrypted value in cookies
 * @param key - Storage key
 * @param value - Value to store (string, number, or object)
 */
export const setEncryptedCookie = (key: StorageKey, value: unknown): void => {
  try {
    // Convert to string if needed
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    const encryptedValue = encrypt(stringValue);
    setCookie(key, encryptedValue);
  } catch (error) {
    console.error(`Failed to set encrypted cookie for key "${key}":`, error);
  }
};

/**
 * Get a decrypted value from cookies
 * @param key - Storage key
 * @returns Decrypted value or null if not found
 */
export const getDecryptedCookie = (key: StorageKey): string | null => {
  try {
    const encryptedValue = getCookieValue(key);
    if (!encryptedValue) {
      return null;
    }

    // Handle URL-encoded values
    const decodedValue = decodeURIComponent(encryptedValue);

    // Check if value is encrypted
    if (isEncrypted(decodedValue)) {
      return decrypt(decodedValue);
    }

    // Return as-is if not encrypted (legacy data)
    return decodedValue;
  } catch (error) {
    console.error(`Failed to get decrypted cookie for key "${key}":`, error);
    return null;
  }
};

/**
 * Get a parsed JSON value from encrypted cookies
 * @param key - Storage key
 * @returns Parsed object or null
 */
export const getDecryptedCookieJSON = <T>(key: StorageKey): T | null => {
  try {
    const value = getDecryptedCookie(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

/**
 * Remove an encrypted cookie
 * @param key - Storage key
 */
export const removeEncryptedCookie = (key: StorageKey): void => {
  deleteCookie(key);
};

/**
 * Clear all encrypted cookies (for logout)
 */
export const clearAllEncryptedCookies = (): void => {
  MIGRATABLE_KEYS.forEach((key) => {
    deleteCookie(key);
  });

  // Also clear any other cookies
  const cookies = document.cookie.split(";");
  cookies.forEach((cookie) => {
    const key = cookie.split("=")[0].trim();
    if (key) {
      deleteCookie(key);
    }
  });
};

/**
 * One-time migration from localStorage to encrypted cookies
 * Should be called on app initialization
 */
export const migrateLocalStorageToCookies = (): void => {
  let migrationPerformed = false;

  MIGRATABLE_KEYS.forEach((key) => {
    const localValue = localStorage.getItem(key);
    if (localValue !== null && localValue !== "") {
      // Check if already exists in cookies
      const existingCookie = getCookieValue(key);
      if (!existingCookie) {
        // Encrypt and store in cookie
        setEncryptedCookie(key, localValue);
        migrationPerformed = true;
      }
      // Remove from localStorage after successful migration
      localStorage.removeItem(key);
    }
  });

  // Clear remaining localStorage items that match our keys
  if (migrationPerformed) {
    console.log("Migration from localStorage to encrypted cookies completed");
  }
};

/**
 * Check if cookies are enabled
 */
export const areCookiesEnabled = (): boolean => {
  try {
    document.cookie = "test_cookie=1";
    const result = document.cookie.indexOf("test_cookie") !== -1;
    document.cookie = "test_cookie=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    return result;
  } catch {
    return false;
  }
};

/**
 * Storage utility object for easy replacement of localStorage calls
 */
export const secureStorage = {
  getItem: (key: StorageKey): string | null => getDecryptedCookie(key),
  setItem: (key: StorageKey, value: string): void => setEncryptedCookie(key, value),
  removeItem: (key: StorageKey): void => removeEncryptedCookie(key),
  clear: (): void => clearAllEncryptedCookies(),
  getJSON: <T>(key: StorageKey): T | null => getDecryptedCookieJSON<T>(key),
  setJSON: (key: StorageKey, value: unknown): void => setEncryptedCookie(key, value),
};

export default secureStorage;
