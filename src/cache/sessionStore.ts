import type { PlayerSnapshot } from "../types/memorial";

const KEY_PREFIX = "memorial-player-snapshot:";

export function saveSnapshot(roomId: string, snapshot: PlayerSnapshot) {
  if (!snapshot.session && !snapshot.tribute) return;
  localStorage.setItem(`${KEY_PREFIX}${roomId}`, JSON.stringify(snapshot));
}

export function loadSnapshot(roomId: string): PlayerSnapshot | null {
  const raw = localStorage.getItem(`${KEY_PREFIX}${roomId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerSnapshot;
  } catch {
    return null;
  }
}

export function clearSnapshot(roomId: string) {
  localStorage.removeItem(`${KEY_PREFIX}${roomId}`);
}
