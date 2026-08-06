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

export async function loadDeviceConfig() {
  try {
    const config = await readIndexedDbConfig();
    if (config?.setupCompleted) return config;
  } catch {
    // Fall back to LocalStorage on restricted kiosk browsers.
  }

  const raw = localStorage.getItem(DEVICE_CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceConfig;
  } catch {
    localStorage.removeItem(DEVICE_CONFIG_KEY);
    return null;
  }
}

export async function saveDeviceConfig(config: DeviceConfig) {
  localStorage.setItem(DEVICE_CONFIG_KEY, JSON.stringify(config));
  try {
    await writeIndexedDbConfig(config);
  } catch {
    // LocalStorage already holds a copy.
  }
}

export async function clearDeviceConfig() {
  localStorage.removeItem(DEVICE_CONFIG_KEY);
  try {
    await clearIndexedDbConfig();
  } catch {
    // Nothing else to clear.
  }
}
