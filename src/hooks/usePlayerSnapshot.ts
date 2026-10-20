import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const lastSessionTributeId = useRef<string | null>(null);
  const [visibleTributeId, setVisibleTributeId] = useState<string | null>(null);
  const onMediaReady = useCallback(() => {
    setVisibleTributeId(tribute?.id ?? null);
  }, [tribute?.id]);

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
        const nextTributeId = nextSession?.tributeId ?? null;
        const shouldReset =
          !nextSession ||
          nextSession.status === "ENDED" ||
          lastSessionTributeId.current !== nextTributeId;

        if (shouldReset) {
          lastSessionTributeId.current = nextTributeId;
          setTribute((current) => current?.id === nextTributeId ? current : null);
          setPlaylist(null);
          setQueue([]);
          setCachedTracks(new Map());
        }

        if (!nextSession || nextSession.status === "ENDED") {
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

  const targetTributeId = session && session.status !== "ENDED"
    ? session.tributeId : room?.preparedTributeId;

  useEffect(() => {
    if (!authenticated || !targetTributeId) return;
    return subscribeTribute(
      targetTributeId,
      (nextTribute) => {
        setTribute(nextTribute);
        setState(nextTribute ? "SYNCING" : "IDLE");
      },
      (err) => {
        setError(err.message);
        setState("ERROR");
      },
    );
  }, [authenticated, targetTributeId]);

  useEffect(() => {
    if (!tribute || session?.status === "PLAYING") return;
    const first = buildPlaybackQueue(tribute.photos ?? [], [], new Map())[0];
    if (!first?.url) return;
    // Warm the browser image cache without displaying the draft. The same
    // URL is used by PlaybackStage when the start command arrives.
    const image = new Image();
    image.fetchPriority = "low";
    image.src = first.url;
    return () => { image.src = ""; };
  }, [tribute, session?.status]);

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
    if (!tribute || tribute.id !== session?.tributeId || session?.status !== "PLAYING") {
      setQueue([]);
      revokeCachedObjectUrls();
      return;
    }

    // Keep the player compatible with older/incomplete Firestore documents.
    // The Cloud stores photos and videos in separate arrays, so missing arrays
    // must not prevent the rest of the tribute from being rendered.
    const photos = Array.isArray(tribute.photos) ? tribute.photos : [];
    const videos = Array.isArray(tribute.videos) ? tribute.videos : [];
    const media = [...photos, ...videos].filter(
      (item) => typeof item?.url === "string" || typeof item?.storagePath === "string",
    );
    // Start playback from the URLs already stored in Firestore. Downloading
    // every photo, video and track is useful for offline playback, but must
    // never block the first slide after the admin starts the tribute.
    const immediateQueue = buildPlaybackQueue(photos, videos, new Map());
    setQueue(immediateQueue);
    setState(media.length > 0 ? "PLAYING" : "IDLE");

    return;
  }, [session?.status, tribute]);

  useEffect(() => {
    if (!tribute || session?.status !== "PLAYING") return;
    const photos = Array.isArray(tribute.photos) ? tribute.photos : [];
    const videos = Array.isArray(tribute.videos) ? tribute.videos : [];
    const media = [...photos, ...videos];
    const tracks = Array.isArray(playlist?.tracks) ? playlist.tracks : [];
    let cancelled = false;

    const timer = window.setTimeout(() => {
    void cacheMedia([...media, ...tracks]).then((cachedUrls) => {
      if (cancelled) return;
      const nextCachedTracks = new Map<string, string>();
      tracks.forEach((track) => {
        const resolvedUrl =
          cachedUrls.get(track.url) ?? cachedUrls.get(track.storagePath) ?? (track.url || track.storagePath);
        if (track.url) nextCachedTracks.set(track.url, resolvedUrl);
        if (track.storagePath) nextCachedTracks.set(track.storagePath, resolvedUrl);
      });
      setCachedTracks(nextCachedTracks);
      const playbackQueue = buildPlaybackQueue(photos, videos, cachedUrls);
      if (import.meta.env.DEV) {
        console.debug("[usePlayerSnapshot] playbackQueue", playbackQueue);
        console.debug("[usePlayerSnapshot] tribute.photos", tribute.photos);
        console.debug("[usePlayerSnapshot] tribute.videos", tribute.videos);
      }
      // Replace the direct URLs with local object URLs as each cache pass
      // completes, keeping the already visible first slide uninterrupted.
      setQueue((current) => playbackQueue.map((item) => {
        const existing = current.find((entry) => entry.id === item.id && entry.url === item.url);
        // Preserve displayed sources after a successful first frame. Changing
        // src to a blob would reload images and restart videos mid-playback.
        return visibleTributeId === tribute.id && existing ? existing : item;
      }));
      void clearOldMedia([...media.map((item) => item.url), ...tracks.map((track) => track.url)]);
    }).catch((err: unknown) => {
      console.warn("Background media cache failed", err);
    });
    }, visibleTributeId === tribute.id ? 100 : 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [playlist?.tracks, session?.status, tribute, visibleTributeId]);

  useEffect(() => {
    return () => revokeCachedObjectUrls();
  }, [roomId]);

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
    onMediaReady,
  };
}
