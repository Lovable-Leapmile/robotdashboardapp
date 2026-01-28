import { getValue, setValue, removeValue, getCookie, setCookie } from "./cookieStorage";

const API_CONFIG_KEY = "api_config";

export interface ApiConfig {
  apiName: string;
  baseUrl: string;
}

/**
 * Get stored API config from cookies ONLY (no localStorage fallback)
 * Cookies are the single source of truth
 */
export const getStoredApiConfig = (): ApiConfig | null => {
  try {
    // Try getValue first (handles JSON parsing)
    const config = getValue<ApiConfig>(API_CONFIG_KEY);
    if (config && config.apiName && config.baseUrl) {
      return config;
    }
    
    // Fallback: try reading raw cookie and parsing manually
    const rawValue = getCookie(API_CONFIG_KEY);
    if (rawValue) {
      try {
        const parsed = JSON.parse(rawValue);
        if (parsed && parsed.apiName && parsed.baseUrl) {
          return parsed;
        }
      } catch {
        // Not valid JSON
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Store API config in cookies ONLY
 */
export const storeApiConfig = (apiName: string): ApiConfig => {
  const trimmed = apiName.trim();
  const baseUrl = `https://${trimmed}.leapmile.com`;
  const config: ApiConfig = { apiName: trimmed, baseUrl };
  
  // Store using setValue which handles JSON stringification
  setValue(API_CONFIG_KEY, config);
  
  // Also set directly to ensure immediate availability
  const stringValue = JSON.stringify(config);
  setCookie(API_CONFIG_KEY, stringValue);
  
  return config;
};

/**
 * Clear API config from cookies
 */
export const clearApiConfig = (): void => {
  removeValue(API_CONFIG_KEY);
};

export const isApiConfigured = (): boolean => {
  return getStoredApiConfig() !== null;
};

export const getApiBaseUrl = (): string => {
  const config = getStoredApiConfig();
  if (!config) {
    throw new Error("API_NOT_CONFIGURED");
  }
  return config.baseUrl;
};
