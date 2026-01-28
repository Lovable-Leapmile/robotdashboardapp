import { secureStorage } from "./encryptedCookieStorage";

export const AUTH_TOKEN_STORAGE_KEY = "auth_token";

export const getStoredAuthToken = (): string | null => {
  const token = secureStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token && token.trim()) return token.trim();
  return null;
};

export const storeAuthToken = (rawToken: unknown) => {
  if (typeof rawToken !== "string") return;
  const t = rawToken.trim();
  if (!t) return;

  const normalized = t.toLowerCase().startsWith("bearer ") ? t : `Bearer ${t}`;
  secureStorage.setItem(AUTH_TOKEN_STORAGE_KEY, normalized);
};
