"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { encryptPayload, decryptPayload } from "../lib/vault";

export type VaultCredentials = {
  geminiApiKey?: string;
  geminiModelName?: string;
  postizBaseUrl?: string;
  postizFrontendUrl?: string;
  postizApiKey?: string;
  postizOAuthAccessToken?: string;
  postizOAuthClientId?: string;
  postizOAuthClientSecret?: string;
};

export type VaultStatus = "missing" | "locked" | "connected" | "failed";

type VaultContextType = {
  vaultStatus: VaultStatus;
  isInitializing: boolean;
  credentials: VaultCredentials | null;
  passphrase?: string;
  unlock: (passphrase: string) => Promise<void>;
  save: (credentials: VaultCredentials, passphrase?: string) => Promise<void>;
  lock: () => void;
  reset: () => void;
  testConnection: (creds: VaultCredentials) => Promise<boolean>;
};

const VaultContext = createContext<VaultContextType | undefined>(undefined);
const VAULT_STORAGE_KEY = "persoulna_vault";
const VAULT_SESSION_PASSPHRASE_KEY = "persoulna_vault_session_passphrase";

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>("missing");
  const [isInitializing, setIsInitializing] = useState(true);
  const [credentials, setCredentials] = useState<VaultCredentials | null>(null);
  const [passphrase, setPassphrase] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      const stored = localStorage.getItem(VAULT_STORAGE_KEY);
      if (!stored) {
        if (!cancelled) {
          sessionStorage.removeItem(VAULT_SESSION_PASSPHRASE_KEY);
          setVaultStatus("missing");
          setIsInitializing(false);
        }
        return;
      }

      const sessionPassphrase = sessionStorage.getItem(VAULT_SESSION_PASSPHRASE_KEY);
      if (!sessionPassphrase) {
        if (!cancelled) {
          setVaultStatus("locked");
          setIsInitializing(false);
        }
        return;
      }

      try {
        const decrypted = await decryptPayload(stored, sessionPassphrase);
        const connected = await testConnection(decrypted);
        if (cancelled) return;
        setCredentials(decrypted);
        setPassphrase(sessionPassphrase);
        setVaultStatus(connected ? "connected" : "failed");
        setIsInitializing(false);
      } catch {
        if (cancelled) return;
        sessionStorage.removeItem(VAULT_SESSION_PASSPHRASE_KEY);
        setCredentials(null);
        setPassphrase("");
        setVaultStatus("locked");
        setIsInitializing(false);
      }
    };

    const timer = setTimeout(() => {
      restoreSession();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const testConnection = async (creds: VaultCredentials): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {};
      if (creds.geminiApiKey) {
        headers["x-vault-gemini-api-key"] = creds.geminiApiKey;
      }
      if (creds.geminiModelName) {
        headers["x-vault-gemini-model-name"] = creds.geminiModelName;
      }
      const token = creds.postizApiKey || creds.postizOAuthAccessToken;
      if (token) {
        headers["x-vault-postiz-token"] = token;
      }
      if (creds.postizBaseUrl) {
        headers["x-vault-postiz-url"] = creds.postizBaseUrl;
      }

      const res = await fetch("/api/vault/test", {
        method: "POST",
        headers,
      });

      if (!res.ok) return false;
      const data = await res.json();
      return data.postiz && data.gemini;
    } catch {
      return false;
    }
  };

  const unlock = async (passphrase: string) => {
    const stored = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!stored) {
      throw new Error("No vault found.");
    }
    const decrypted = await decryptPayload(stored, passphrase);
    setCredentials(decrypted);
    setPassphrase(passphrase);
    sessionStorage.setItem(VAULT_SESSION_PASSPHRASE_KEY, passphrase);
    const connected = await testConnection(decrypted);
    setVaultStatus(connected ? "connected" : "failed");
  };

  const save = async (newCreds: VaultCredentials, newPassphrase?: string) => {
    const activePassphrase = newPassphrase || passphrase;
    if (!activePassphrase) {
      throw new Error("Passphrase is required.");
    }
    const encrypted = await encryptPayload(newCreds, activePassphrase);
    localStorage.setItem(VAULT_STORAGE_KEY, encrypted);
    sessionStorage.setItem(VAULT_SESSION_PASSPHRASE_KEY, activePassphrase);
    setCredentials(newCreds);
    setPassphrase(activePassphrase);
    const connected = await testConnection(newCreds);
    setVaultStatus(connected ? "connected" : "failed");
  };

  const lock = () => {
    sessionStorage.removeItem(VAULT_SESSION_PASSPHRASE_KEY);
    setCredentials(null);
    setPassphrase("");
    setVaultStatus("locked");
  };

  const reset = () => {
    localStorage.removeItem(VAULT_STORAGE_KEY);
    sessionStorage.removeItem(VAULT_SESSION_PASSPHRASE_KEY);
    setCredentials(null);
    setPassphrase("");
    setVaultStatus("missing");
  };

  return (
    <VaultContext.Provider
      value={{
        vaultStatus,
        isInitializing,
        credentials,
        passphrase,
        unlock,
        save,
        lock,
        reset,
        testConnection,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
