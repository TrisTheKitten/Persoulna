/**
 * Browser-local Web Crypto vault encryption/decryption helpers.
 * Run strictly on the client side.
 */

// Helper to convert ArrayBuffer or Uint8Array to Base64
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-GCM key from passphrase and salt using PBKDF2
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey", "deriveBits"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts an object payload with a passphrase using AES-GCM.
 * Returns a JSON-serializable structure encoded as a single Base64 string.
 */
export async function encryptPayload(payload: object, passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(JSON.stringify(payload));

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    dataBytes
  );

  const envelope = {
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertext),
  };

  return window.btoa(JSON.stringify(envelope));
}

/**
 * Decrypts a Base64 encoded payload with a passphrase.
 * Throws an error if decryption fails (e.g. wrong passphrase).
 */
export async function decryptPayload(encryptedBase64: string, passphrase: string): Promise<any> {
  try {
    const envelopeRaw = window.atob(encryptedBase64);
    const envelope = JSON.parse(envelopeRaw);

    const salt = new Uint8Array(base64ToBuffer(envelope.salt));
    const iv = new Uint8Array(base64ToBuffer(envelope.iv));
    const ciphertext = base64ToBuffer(envelope.ciphertext);

    const key = await deriveKey(passphrase, salt);

    const decryptedBytes = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedBytes));
  } catch (error) {
    throw new Error("Decryption failed. Invalid passphrase.");
  }
}
