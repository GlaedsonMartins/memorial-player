import type { Timestamp } from "firebase/firestore";

export const ROOM_COUNT = 6;
export const ALLOWED_SLIDE_DURATIONS = [5, 8, 10] as const;
export const SCHEMA_VERSION = 1;

export type SlideDuration = (typeof ALLOWED_SLIDE_DURATIONS)[number];
export type ActiveSessionStatus = "WAITING" | "PLAYING" | "ENDING" | "ENDED";
export type TributeStatus = "CREATED" | "ACTIVE" | "ENDED" | "DELETED";
export type MediaType = "image" | "video";
export type PlayerState =
  | "INITIALIZING"
  | "CONNECTING"
  | "SYNCING"
  | "READY"
  | "PLAYING"
  | "IDLE"
  | "OFFLINE"
  | "RECONNECTING"
  | "ERROR";

export interface Room {
  id: string;
  name: string;
  number: number;
  playerId: string;
  playerUrl?: string | null;
  active: boolean;
  status: string;
  activeTributeId: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  schemaVersion: number;
}

export interface PlayerClaims {
  player?: boolean;
  device?: boolean;
  deviceId?: string;
  roomId?: string;
  playerId?: string;
}

export interface ActiveRoomOption {
  id: string;
  name: string;
  number: number;
  playerUrl: string;
}

export interface DeviceConfig {
  deviceId: string;
  deviceName?: string;
  roomId: string;
  deviceToken: string;
  setupCompleted: true;
  // Optional helper fields saved locally
  playerUrl?: string;
  roomNumber?: number;
}

export interface RegisteredDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  roomId: string;
  setupCompleted: boolean;
  registeredAt: Timestamp | null;
  lastHeartbeat: Timestamp | null;
  lastSeen: Timestamp | null;
  online: boolean;
  currentState: string;
  appVersion: string | null;
  kioskEnabled: boolean;
  schemaVersion: number;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  type: MediaType;
  order: number;
  duration?: number;
  createdAt: Timestamp | null;
}

export interface PlaylistTrack {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  duration: number | null;
  order: number;
  createdAt: Timestamp | null;
}

export interface Playlist {
  id: string;
  name: string;
  category: "CATOLICA" | "EVANGELICA";
  tracks: PlaylistTrack[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  schemaVersion: number;
}

export interface Tribute {
  id: string;
  name: string;
  roomId: string;
  photos: MediaItem[];
  videos: MediaItem[];
  playlistId: string;
  slideDuration: SlideDuration;
  notes: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  startedAt: Timestamp | null;
  endedAt: Timestamp | null;
  createdBy: string;
  status: TributeStatus;
  schemaVersion: number;
}

export interface ActiveSession {
  id: string;
  roomId: string;
  tributeId: string;
  status: ActiveSessionStatus;
  startedAt: Timestamp | null;
  endedAt: Timestamp | null;
  playlistId: string;
  slideDuration: SlideDuration;
  lastUpdate: Timestamp | null;
  updatedAt: Timestamp | null;
  schemaVersion: number;
}

export interface Settings {
  id: string;
  companyName: string;
  logoUrl: string | null;
  logoStoragePath: string | null;
  defaultScreenUrl: string | null;
  defaultScreenStoragePath: string | null;
  heartbeatOfflineSeconds: number;
  updatedAt: Timestamp | null;
  schemaVersion: number;
}

export type PlaybackItem = MediaItem & {
  cachedUrl: string;
};

export interface PlayerSnapshot {
  room: Room | null;
  session: ActiveSession | null;
  tribute: Tribute | null;
  playlist: Playlist | null;
  settings: Settings | null;
}
