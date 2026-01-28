import { getValue, setValue, removeValue } from "./cookieStorage";

const API_CONFIG_KEY = "api_config";

export interface ApiConfig {
  apiName: string;
  baseUrl: string;
}

/**
 * Get stored API config from cookies/localStorage
 */
export const getStoredApiConfig = (): ApiConfig | null => {
  try {
    const config = getValue<ApiConfig>(API_CONFIG_KEY);
    if (config && config.apiName && config.baseUrl) {
      return config;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Store API config
 */
export const storeApiConfig = (apiName: string): ApiConfig => {
  const trimmed = apiName.trim();
  const baseUrl = `https://${trimmed}.leapmile.com`;
  const config: ApiConfig = { apiName: trimmed, baseUrl };
  
  // Store using setValue which handles both cookies and localStorage
  setValue(API_CONFIG_KEY, config);
  
  return config;
};

/**
 * Clear API config
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
