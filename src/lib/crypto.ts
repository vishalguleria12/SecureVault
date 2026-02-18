// Web Crypto API utilities for demonstrating cryptographic concepts

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Derive a key from master password using PBKDF2
export async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// AES-256-GCM encryption
export async function encrypt(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// AES-256-GCM decryption
export async function decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const encData = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivData },
    key,
    encData
  );
  return decoder.decode(decrypted);
}

// Hash password for storage verification
export async function hashPassword(password: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await deriveKey(password, salt);
  const exported = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Generate a random salt
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

// Real TOTP using otpauth library
import * as OTPAuth from 'otpauth';

export function createTOTP(secret: string, label = 'user'): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: 'SecureVault',
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export function generateOTPSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function verifyTOTP(secret: string, token: string): boolean {
  const totp = createTOTP(secret);
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export function getTOTPUri(secret: string, label = 'user'): string {
  const totp = createTOTP(secret, label);
  return totp.toString();
}

export function getTOTPRemaining(period = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}

// Measure key derivation time
export async function measureKeyDerivation(password: string, iterations: number): Promise<number> {
  const salt = generateSalt() as Uint8Array<ArrayBuffer>;
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const start = performance.now();
  await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return performance.now() - start;
}

// Password strength calculator
export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 20; else feedback.push("At least 8 characters");
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (/[a-z]/.test(password)) score += 10; else feedback.push("Add lowercase letters");
  if (/[A-Z]/.test(password)) score += 15; else feedback.push("Add uppercase letters");
  if (/[0-9]/.test(password)) score += 15; else feedback.push("Add numbers");
  if (/[^a-zA-Z0-9]/.test(password)) score += 20; else feedback.push("Add special characters");

  const label = score < 30 ? "Weak" : score < 60 ? "Fair" : score < 80 ? "Strong" : "Very Strong";
  const color = score < 30 ? "destructive" : score < 60 ? "cyber-yellow" : score < 80 ? "cyber-blue" : "primary";

  return { score: Math.min(100, score), label, color, feedback };
}
