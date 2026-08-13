import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaylistTrack } from "../types/memorial";

export type AudioPlaybackStatus = "empty" | "loading" | "playing" | "paused" | "blocked" | "error";

type AudioStatusHandler = (status: AudioPlaybackStatus, message?: string) => void;

export function AudioPlaylist({
  tracks,
  cachedTracks,
  muted,
  onStatus,
}: {
  tracks: PlaylistTrack[];
  cachedTracks: Map<string, string>;
  muted: boolean;
  onStatus?: AudioStatusHandler;
}) {
  const orderedTracks = useMemo(() => tracks.slice().sort((a, b) => a.order - b.order), [tracks]);
  const [status, setStatus] = useState<AudioPlaybackStatus>(
    orderedTracks.length > 0 ? "loading" : "empty",
  );
  const [index, setIndex] = useState(0);
  const trackKey = orderedTracks
    .map((track) => `${track.id}:${track.url}:${track.storagePath}`)
    .join("|");
  const currentTrack = orderedTracks[index % Math.max(orderedTracks.length, 1)];
  const source = currentTrack
    ? cachedTracks.get(currentTrack.url) ??
      cachedTracks.get(currentTrack.storagePath) ??
      (currentTrack.url || currentTrack.storagePath)
    : "";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onStatusRef = useRef(onStatus);
  const sourceRef = useRef(source);
  onStatusRef.current = onStatus;
  sourceRef.current = source;

  function reportStatus(nextStatus: AudioPlaybackStatus, message?: string) {
    setStatus(nextStatus);
    onStatusRef.current?.(nextStatus, message);
  }

  const attemptPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !sourceRef.current) return;
    try {
      await audio.play();
      reportStatus("playing");
    } catch (error) {
      const mediaError = error instanceof Error ? error.message : "Nao foi possivel reproduzir a faixa.";
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        reportStatus("blocked", "Clique na tela para ativar a musica.");
      } else {
        reportStatus("error", mediaError);
      }
    }
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [trackKey]);

  useEffect(() => {
    if (!currentTrack) {
      reportStatus("empty");
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !source) return;

    audio.load();
    reportStatus("loading");
    void attemptPlay();
  }, [attemptPlay, source]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (status !== "blocked") return;

    const activateAudio = () => {
      void attemptPlay();
    };
    window.addEventListener("pointerdown", activateAudio, { capture: true, once: true });
    window.addEventListener("keydown", activateAudio, { capture: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", activateAudio, { capture: true });
      window.removeEventListener("keydown", activateAudio, { capture: true });
    };
  }, [attemptPlay, source, status]);

  if (!currentTrack) return null;

  return (
    <audio
      ref={audioRef}
      src={source}
      autoPlay
      muted={muted}
      preload="auto"
      onCanPlay={() => {
        if (status !== "playing") void attemptPlay();
      }}
      onPlay={() => reportStatus("playing")}
      onError={() => reportStatus("error", "A faixa nao pode ser carregada pelo Player.")}
      onEnded={() => {
        if (orderedTracks.length === 1) {
          const audio = audioRef.current;
          if (audio) {
            audio.currentTime = 0;
            void attemptPlay();
          }
          return;
        }
        setIndex((current) => (current + 1) % orderedTracks.length);
      }}
    />
  );
}
