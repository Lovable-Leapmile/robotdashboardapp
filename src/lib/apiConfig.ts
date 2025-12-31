const API_CONFIG_KEY = "api_config";

export interface ApiConfig {
  apiName: string;
  baseUrl: string;
}

export const getStoredApiConfig = (): ApiConfig | null => {
  try {
    const stored = localStorage.getItem(API_CONFIG_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as ApiConfig;
    if (parsed.apiName && parsed.baseUrl) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const storeApiConfig = (apiName: string): ApiConfig => {
  const trimmed = apiName.trim();
  
  // Determine the base URL based on the format:
  // Input: apiname.domainname (e.g., "staging.leapmile", "compasalary.api")
  // 
  // Rules:
  // - If domainname is "leapmile" -> https://{apiname}.leapmile.com (e.g., staging.leapmile -> https://staging.leapmile.com)
  // - Otherwise -> https://{input}.leapmile.com (e.g., compasalary.api -> https://compasalary.api.leapmile.com)
  let baseUrl: string;
  
  const parts = trimmed.split('.');
  const domainPart = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  
  // Known domain names that should result in https://{input}.com
  const knownDomains = ['leapmile'];
  
  if (knownDomains.includes(domainPart)) {
    // e.g., "staging.leapmile" -> "https://staging.leapmile.com"
    baseUrl = `https://${trimmed}.com`;
  } else {
    // Default: append .leapmile.com 
    // e.g., "compasalary.api" -> "https://compasalary.api.leapmile.com"
    baseUrl = `https://${trimmed}.leapmile.com`;
  }
  
  const config: ApiConfig = { apiName: trimmed, baseUrl };
  localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));
  return config;
};

export const clearApiConfig = (): void => {
  localStorage.removeItem(API_CONFIG_KEY);
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
