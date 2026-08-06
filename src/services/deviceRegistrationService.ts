import { signInWithCustomToken, signOut } from "firebase/auth";
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
  await signInWithCustomToken(getFirebaseAuth(), result.data.customToken);
  const config = { ...result.data };
  delete (config as Partial<DeviceSessionResult>).customToken;
  return config;
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
  await signInWithCustomToken(getFirebaseAuth(), result.data.customToken);
  const nextConfig = { ...result.data };
  delete (nextConfig as Partial<DeviceSessionResult>).customToken;
  return { ...config, ...nextConfig };
}

export async function signOutDevice() {
  await signOut(getFirebaseAuth());
}
