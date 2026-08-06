import { signInWithCustomToken, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseFunctions } from "../firebase/client";
import type { ActiveRoomOption, DeviceConfig } from "../types/memorial";

interface ListActiveRoomsResult {
  rooms: ActiveRoomOption[];
}

interface DeviceSessionResult extends DeviceConfig {
  customToken: string;
}

export async function listActiveRooms() {
  const callable = httpsCallable<void, ListActiveRoomsResult>(
    getFirebaseFunctions(),
    "listActiveRooms",
  );
  const result = await callable();
  return result.data.rooms;
}

export async function registerDevice(deviceName: string, roomId: string) {
  const callable = httpsCallable<{ deviceName: string; roomId: string }, DeviceSessionResult>(
    getFirebaseFunctions(),
    "registerDevice",
  );
  const result = await callable({ deviceName, roomId });
  const auth = getFirebaseAuth();
  // Ensure persistence is set before signing in
  await setPersistence(auth, browserLocalPersistence);
  await signInWithCustomToken(auth, result.data.customToken);

  // Compute playerUrl/roomNumber from roomId (e.g. room-01 -> /sala/1)
  const match = (result.data.roomId || "").match(/(\d+)$/);
  const roomNumber = match ? parseInt(match[1], 10) : undefined;
  const playerUrl = roomNumber ? `/sala/${roomNumber}` : `/sala/${result.data.roomId}`;

  const config = { ...result.data } as DeviceConfig & Partial<DeviceSessionResult>;
  delete (config as Partial<DeviceSessionResult>).customToken;
  if (roomNumber) config.roomNumber = roomNumber;
  config.playerUrl = playerUrl;

  if (import.meta.env.DEV) {
    console.debug("registerDevice result:", result.data);
    console.debug("signed in uid:", auth.currentUser?.uid ?? null);
    console.debug("calculated playerUrl:", playerUrl);
  }

  return config as DeviceConfig;
}

export async function refreshDeviceSession(config: DeviceConfig) {
  const callable = httpsCallable<
    Pick<DeviceConfig, "deviceId" | "deviceToken">,
    DeviceSessionResult
  >(getFirebaseFunctions(), "refreshDeviceSession");
  const result = await callable({
    deviceId: config.deviceId,
    deviceToken: config.deviceToken,
  });
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  await signInWithCustomToken(auth, result.data.customToken);

  const nextConfig = { ...result.data } as DeviceConfig & Partial<DeviceSessionResult>;
  delete (nextConfig as Partial<DeviceSessionResult>).customToken;
  const match = (nextConfig.roomId || "").match(/(\d+)$/);
  const roomNumber = match ? parseInt(match[1], 10) : undefined;
  if (roomNumber) nextConfig.roomNumber = roomNumber;
  nextConfig.playerUrl = roomNumber ? `/sala/${roomNumber}` : `/sala/${nextConfig.roomId}`;

  if (import.meta.env.DEV) {
    console.debug("refreshDeviceSession result:", result.data);
    console.debug("signed in uid:", auth.currentUser?.uid ?? null);
  }

  return { ...config, ...nextConfig };
}

export async function signOutDevice() {
  await signOut(getFirebaseAuth());
}
