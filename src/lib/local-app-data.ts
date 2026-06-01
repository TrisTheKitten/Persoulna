"use client";

import { decryptPayload, encryptPayload } from "./vault";

const DATABASE_NAME = "persoulna_local";
const DATABASE_VERSION = 1;
const STORE_NAME = "encrypted_records";
const APP_DATA_PREFIX = "app_data:";

export type LocalIntegration = {
  id: string;
  postizIntegrationId: string;
  identifier: string;
  name: string;
  profile: string | null;
  picture?: string | null;
  disabled: boolean;
  rawResponse?: unknown;
  fetchedAt: string;
};

export type LocalPersonaSummary = {
  id: string;
  version: number;
  display_name: string;
  status: string;
  main_topics: string;
  persona_md: string;
  style_rules: unknown;
  memory_summary: string | null;
};

export type LocalWritingExample = {
  id: string;
  rawText: string;
  sourceFileName: string | null;
  sourceMimeType: string | null;
  sourceByteSize: number | null;
  memorySyncStatus: string;
  durableMemoryItems: unknown;
  skippedItems: unknown;
  memorySummary: string | null;
  createdAt: string;
};

export type LocalAppData = {
  schemaVersion: number;
  active_persona_summary: LocalPersonaSummary | null;
  writing_examples: LocalWritingExample[];
  postiz_integrations: LocalIntegration[];
  latest_content_batch: any | null;
  latest_scheduled_posts: any[];
  latest_insight_digest: any | null;
  latest_email_send_status: any | null;
  updatedAt: string | null;
};

export const EMPTY_LOCAL_APP_DATA: LocalAppData = {
  schemaVersion: 1,
  active_persona_summary: null,
  writing_examples: [],
  postiz_integrations: [],
  latest_content_batch: null,
  latest_scheduled_posts: [],
  latest_insight_digest: null,
  latest_email_send_status: null,
  updatedAt: null,
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readRecord(key: string): Promise<string | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => {
      resolve(typeof request.result === "string" ? request.result : null);
      database.close();
    };
    request.onerror = () => {
      reject(request.error);
      database.close();
    };
  });
}

async function writeRecord(key: string, value: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => {
      resolve();
      database.close();
    };
    request.onerror = () => {
      reject(request.error);
      database.close();
    };
  });
}

function appDataKey(userId: string) {
  return `${APP_DATA_PREFIX}${userId}`;
}

export async function loadLocalAppData(userId: string, passphrase: string) {
  const encrypted = await readRecord(appDataKey(userId));
  if (!encrypted) {
    return EMPTY_LOCAL_APP_DATA;
  }
  const data = await decryptPayload(encrypted, passphrase);
  return { ...EMPTY_LOCAL_APP_DATA, ...data } as LocalAppData;
}

export async function saveLocalAppData(
  userId: string,
  passphrase: string,
  data: LocalAppData,
) {
  const encrypted = await encryptPayload(
    { ...data, updatedAt: new Date().toISOString() },
    passphrase,
  );
  await writeRecord(appDataKey(userId), encrypted);
}

export function mergeDashboardData(serverData: any, localData: LocalAppData) {
  const hasActivePersona = Boolean(localData.active_persona_summary);
  const hasAnyPostizIntegration = localData.postiz_integrations.length > 0;
  const hasSupportedPlatformConnected = localData.postiz_integrations.some(
    (integration) => !integration.disabled,
  );
  const hasContentBatchGenerated = Boolean(localData.latest_content_batch);
  const hasInsightDigest = Boolean(localData.latest_insight_digest);
  const blockers = [
    !hasActivePersona ? "missing_active_persona" : null,
    !hasAnyPostizIntegration ? "no_postiz_integrations" : null,
    !hasSupportedPlatformConnected ? "no_supported_platform_connected" : null,
    !hasContentBatchGenerated ? "no_draft_generated" : null,
    !hasInsightDigest ? "no_insight_digest" : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ...serverData,
    ...localData,
    user: serverData.user,
    readiness: {
      blockers,
      can_generate_drafts: hasActivePersona && hasSupportedPlatformConnected,
      can_schedule: hasSupportedPlatformConnected,
      can_analyze: hasSupportedPlatformConnected,
    },
  };
}
