import { useEffect, useMemo, useState } from "react";
import type { FirestoreError, Unsubscribe } from "firebase/firestore";
import { cacheMedia, clearOldMedia, revokeCachedObjectUrls } from "../cache/mediaCache";
import { clearSnapshot, loadSnapshot, saveSnapshot } from "../cache/sessionStore";
import {
  disposeAll,
  markDeviceOffline,
  subscribePlaylist,
  subscribeRoom,
  subscribeSession,
  subscribeSettings,
  subscribeTribute,
  updateDeviceHeartbeat,
} from "../services/playerService";
import { buildPlaybackQueue } from "../player/queue";
import type {
  ActiveSession,
  PlaybackItem,
  PlayerSnapshot,
  PlayerState,
  Playlist,
  Room,
  Settings,
  Tribute,
} from "../types/memorial";

export function usePlayerSnapshot(roomId: string, deviceId: string, authenticated: boolean) {
  const restored = useMemo(() => loadSnapshot(roomId), [roomId]);
  const [room, setRoom] = useState<Room | null>(restored?.room ?? null);
  const [session, setSession] = useState<ActiveSession | null>(restored?.session ?? null);
  const [tribute, setTribute] = useState<Tribute | null>(restored?.tribute ?? null);
  const [playlist, setPlaylist] = useState<Playlist | null>(restored?.playlist ?? null);
  const [settings, setSettings] = useState<Settings | null>(restored?.settings ?? null);
  const [state, setState] = useState<PlayerState>("INITIALIZING");
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<PlaybackItem[]>([]);
  const [cachedTracks, setCachedTracks] = useState<Map<string, string>>(new Map());

  const snapshot = useMemo<PlayerSnapshot>(
    () => ({ room, session, tribute, playlist, settings }),
    [playlist, room, session, settings, tribute],
  );

  useEffect(() => {
    if (!authenticated || !roomId) return;
    setState("CONNECTING");

    const onError = (err: FirestoreError) => {
      setError(err.message);
      setState(navigator.onLine ? "ERROR" : "OFFLINE");
    };

    const unsubscribers: Unsubscribe[] = [
      subscribeRoom(roomId, setRoom, onError),
      subscribeSession(roomId, (nextSession) => {
        setSession(nextSession);
        if (!nextSession || nextSession.status === "ENDED") {
          setTribute(null);
          setPlaylist(null);
          setState("IDLE");
          clearSnapshot(roomId);
        } else {
          setState("SYNCING");
        }
      }, onError),
      subscribeSettings(setSettings, onError),
    ];

    return () => disposeAll(unsubscribers);
  }, [authenticated, roomId]);

  useEffect(() => {
    if (!authenticated || !session?.tributeId || session.status === "ENDED") return;
    return subscribeTribute(
      session.tributeId,
      (nextTribute) => {
        setTribute(nextTribute);
        setState(nextTribute ? "SYNCING" : "IDLE");
      },
      (err) => {
        setError(err.message);
        setState("ERROR");
      },
    );
  }, [authenticated, session?.status, session?.tributeId]);

  useEffect(() => {
    const playlistId = tribute?.playlistId ?? session?.playlistId;
    if (!authenticated || !playlistId || session?.status === "ENDED") return;
    return subscribePlaylist(
      playlistId,
      (nextPlaylist) => setPlaylist(nextPlaylist),
      (err) => {
        setError(err.message);
        setState("ERROR");
      },
    );
  }, [authenticated, session?.playlistId, session?.status, tribute?.playlistId]);

  useEffect(() => {
    if (!tribute) {
      setQueue([]);
      return;
    }

    const media = [...tribute.photos, ...tribute.videos];
    const tracks = playlist?.tracks ?? [];
    let cancelled = false;

    void cacheMedia([...media, ...tracks]).then((cachedUrls) => {
      if (cancelled) return;
      setCachedTracks(new Map(tracks.map((track) => [track.url, cachedUrls.get(track.url) ?? track.url])));
      setQueue(buildPlaybackQueue(tribute.photos, tribute.videos, cachedUrls));
      void clearOldMedia([...media.map((item) => item.url), ...tracks.map((track) => track.url)]);
      setState(media.length > 0 ? "PLAYING" : "IDLE");
    });

    return () => {
      cancelled = true;
      revokeCachedObjectUrls();
    };
  }, [playlist?.tracks, tribute]);

  useEffect(() => {
    saveSnapshot(roomId, snapshot);
  }, [roomId, snapshot]);

  useEffect(() => {
    if (!authenticated || !deviceId) return;
    const heartbeat = () =>
      void updateDeviceHeartbeat({
        deviceId,
        state,
      }).catch(console.error);
    heartbeat();
    const interval = window.setInterval(heartbeat, 30_000);
    return () => window.clearInterval(interval);
  }, [authenticated, deviceId, state]);

  useEffect(() => {
    if (!authenticated || !deviceId) return;
    const markOffline = () => void markDeviceOffline(deviceId).catch(() => undefined);
    window.addEventListener("pagehide", markOffline);
    return () => window.removeEventListener("pagehide", markOffline);
  }, [authenticated, deviceId]);

  useEffect(() => {
    const updateOnlineState = () => setState((current) => (navigator.onLine ? current : "OFFLINE"));
    window.addEventListener("offline", updateOnlineState);
    window.addEventListener("online", updateOnlineState);
    return () => {
      window.removeEventListener("offline", updateOnlineState);
      window.removeEventListener("online", updateOnlineState);
    };
  }, []);

  return {
    roomId,
    playerId: deviceId,
    snapshot,
    queue,
    cachedTracks,
    state,
    error,
  };
}
