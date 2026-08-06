import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "../firebase/client";
import type {
  ActiveSession,
  PlayerSnapshot,
  PlayerState,
  Playlist,
  RegisteredDevice,
  Room,
  Settings,
  Tribute,
} from "../types/memorial";

function withDoc<T>(id: string, data: DocumentData | undefined) {
  return data ? ({ id, ...data } as T) : null;
}

export function subscribeRoom(roomId: string, callback: (room: Room | null) => void, onError: (error: FirestoreError) => void) {
  return onSnapshot(doc(getFirebaseDb(), "rooms", roomId), (snapshot) => callback(withDoc<Room>(snapshot.id, snapshot.data())), onError);
}

export function subscribeSession(
  roomId: string,
  callback: (session: ActiveSession | null) => void,
  onError: (error: FirestoreError) => void,
) {
  return onSnapshot(
    doc(getFirebaseDb(), "active_sessions", roomId),
    (snapshot) => callback(withDoc<ActiveSession>(snapshot.id, snapshot.data())),
    onError,
  );
}

export function subscribeTribute(
  tributeId: string,
  callback: (tribute: Tribute | null) => void,
  onError: (error: FirestoreError) => void,
) {
  return onSnapshot(
    doc(getFirebaseDb(), "tributes", tributeId),
    (snapshot) => callback(withDoc<Tribute>(snapshot.id, snapshot.data())),
    onError,
  );
}

export function subscribePlaylist(
  playlistId: string,
  callback: (playlist: Playlist | null) => void,
  onError: (error: FirestoreError) => void,
) {
  return onSnapshot(
    doc(getFirebaseDb(), "playlists", playlistId),
    (snapshot) => callback(withDoc<Playlist>(snapshot.id, snapshot.data())),
    onError,
  );
}

export function subscribeSettings(callback: (settings: Settings | null) => void, onError: (error: FirestoreError) => void) {
  return onSnapshot(
    doc(getFirebaseDb(), "settings", "general"),
    (snapshot) => callback(withDoc<Settings>(snapshot.id, snapshot.data())),
    onError,
  );
}

export function subscribeDevice(
  deviceId: string,
  callback: (device: RegisteredDevice | null) => void,
  onError: (error: FirestoreError) => void,
) {
  return onSnapshot(
    doc(getFirebaseDb(), "devices", deviceId),
    (snapshot) => callback(withDoc<RegisteredDevice>(snapshot.id, snapshot.data())),
    onError,
  );
}

export async function updateDeviceHeartbeat({
  deviceId,
  state,
}: {
  deviceId: string;
  state: PlayerState;
}) {
  await setDoc(
    doc(getFirebaseDb(), "devices", deviceId),
    {
      online: navigator.onLine,
      lastHeartbeat: serverTimestamp(),
      lastSeen: serverTimestamp(),
      currentState: state,
      appVersion: import.meta.env.VITE_PLAYER_APP_VERSION ?? "1.0.0",
      kioskEnabled: true,
    },
    { merge: true },
  );
}

export async function markDeviceOffline(deviceId: string) {
  await updateDoc(doc(getFirebaseDb(), "devices", deviceId), {
    online: false,
    currentState: "OFFLINE",
    lastHeartbeat: serverTimestamp(),
    lastSeen: serverTimestamp(),
  });
}

export function disposeAll(unsubscribers: Array<Unsubscribe | undefined>) {
  unsubscribers.forEach((unsubscribe) => unsubscribe?.());
}

export function isPlayable(snapshot: PlayerSnapshot) {
  return snapshot.session?.status === "PLAYING" && snapshot.tribute?.status === "ACTIVE";
}
