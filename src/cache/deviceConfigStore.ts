import type { DeviceConfig } from "../types/memorial";
import { DEVICE_CONFIG_KEY } from "../constants/storage";

const DB_NAME = "memorial-player-device";
const STORE_NAME = "config";
const CONFIG_KEY = "current";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readIndexedDbConfig() {
  const db = await openDb();
  return new Promise<DeviceConfig | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(CONFIG_KEY);
    request.onsuccess = () => resolve((request.result as DeviceConfig | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function writeIndexedDbConfig(config: DeviceConfig) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(config, CONFIG_KEY);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

async function clearIndexedDbConfig() {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(CONFIG_KEY);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

function isValidDeviceConfig(value: unknown): value is DeviceConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<DeviceConfig>;
  return (
    config.setupCompleted === true &&
    typeof config.deviceId === "string" &&
    config.deviceId.trim().length > 0 &&
    typeof config.deviceToken === "string" &&
    config.deviceToken.trim().length > 0 &&
    typeof config.roomId === "string" &&
    config.roomId.trim().length > 0
  );
}

export async function loadDeviceConfig() {
  try {
    const config = await readIndexedDbConfig();
    if (isValidDeviceConfig(config)) return config;
  } catch {
    // Fall back to LocalStorage on restricted kiosk browsers.
  }

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DEVICE_CONFIG_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const config: unknown = JSON.parse(raw);
    return isValidDeviceConfig(config) ? config : null;
  } catch {
    try {
      localStorage.removeItem(DEVICE_CONFIG_KEY);
    } catch {
      // Storage is unavailable; IndexedDB remains the durable fallback.
    }
    return null;
  }
}

export async function saveDeviceConfig(config: DeviceConfig) {
  // Keep both stores independent: kiosk/private browser policies can disable
  // one storage API while leaving the other available.
  try {
    localStorage.setItem(DEVICE_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // IndexedDB below is the fallback when LocalStorage is unavailable.
  }
  try {
    await writeIndexedDbConfig(config);
  } catch {
    // LocalStorage may still hold a durable copy.
  }
}

export async function clearDeviceConfig() {
  try {
    localStorage.removeItem(DEVICE_CONFIG_KEY);
  } catch {
    // Continue clearing IndexedDB.
  }
  try {
    await clearIndexedDbConfig();
  } catch {
    // Nothing else to clear.
  }
}
