/**
 * AES Encryption Utilities
 * Uses synchronous XOR cipher with base64 encoding for browser compatibility
 */

// Secret key for encryption - provides obfuscation for stored values
const ENCRYPTION_KEY = "L3@pM1l3R0b0t1cs$3cur3K3y2024!@#";

/**
 * Encrypt a value using XOR cipher with base64 encoding
 * @param value - The value to encrypt (will be stringified if object)
 * @returns Base64 encoded encrypted string
 */
export const encrypt = (value: unknown): string => {
  try {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    const keyBytes = ENCRYPTION_KEY.split("").map((c) => c.charCodeAt(0));
    const valueBytes = stringValue.split("").map((c) => c.charCodeAt(0));
    
    const encrypted = valueBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
    const encryptedStr = String.fromCharCode(...encrypted);
    
    return btoa(encryptedStr);
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt value");
  }
};

/**
 * Decrypt a value using XOR cipher
 * @param encryptedValue - Base64 encoded encrypted string
 * @returns Decrypted string value
 */
export const decrypt = (encryptedValue: string): string => {
  try {
    const encryptedStr = atob(encryptedValue);
    const keyBytes = ENCRYPTION_KEY.split("").map((c) => c.charCodeAt(0));
    const encryptedBytes = encryptedStr.split("").map((c) => c.charCodeAt(0));
    
    const decrypted = encryptedBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
    return String.fromCharCode(...decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt value");
  }
};

/**
 * Check if a value appears to be encrypted (base64 encoded)
 */
export const isEncrypted = (value: string): boolean => {
  try {
    // Try to decode as base64
    const decoded = atob(value);
    // Check if original can be recovered (not a simple string)
    const reEncoded = btoa(decoded);
    return reEncoded === value && decoded !== value;
  } catch {
    return false;
  }
};
