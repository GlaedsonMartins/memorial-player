import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaylistTrack } from "../types/memorial";

export type AudioPlaybackStatus = "empty" | "loading" | "playing" | "paused" | "blocked" | "error";

type AudioStatusHandler = (status: AudioPlaybackStatus, message?: string) => void;

export function AudioPlaylist({
  tracks,
  cachedTracks,
  paused,
  onStatus,
}: {
  tracks: PlaylistTrack[];
  cachedTracks: Map<string, string>;
  paused: boolean;
  onStatus?: AudioStatusHandler;
}) {
  const orderedTracks = useMemo(() => tracks.slice().sort((a, b) => a.order - b.order), [tracks]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<AudioPlaybackStatus>(
    orderedTracks.length > 0 ? "loading" : "empty",
  );
  const trackKey = orderedTracks.map((track) => `${track.id}:${track.url}:${track.storagePath}`).join("|");
  const currentTrack = orderedTracks[index % Math.max(orderedTracks.length, 1)];
  const source = currentTrack
    ? cachedTracks.get(currentTrack.url) ??
      cachedTracks.get(currentTrack.storagePath) ??
      (currentTrack.url || currentTrack.storagePath)
    : "";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onStatusRef = useRef(onStatus);
  const pausedRef = useRef(paused);
  const sourceRef = useRef(source);
  onStatusRef.current = onStatus;
  pausedRef.current = paused;
  sourceRef.current = source;

  function reportStatus(nextStatus: AudioPlaybackStatus, message?: string) {
    setStatus(nextStatus);
    onStatusRef.current?.(nextStatus, message);
  }

  const attemptPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || pausedRef.current || !sourceRef.current) return;
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

    audio.pause();
    audio.load();
    if (paused) {
      reportStatus("paused");
      return;
    }

    reportStatus("loading");
    void attemptPlay();
  }, [attemptPlay, paused, source]);

  useEffect(() => {
    if (status !== "blocked" || paused) return;

    const activateAudio = () => {
      void attemptPlay();
    };
    window.addEventListener("pointerdown", activateAudio, { capture: true, once: true });
    window.addEventListener("keydown", activateAudio, { capture: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", activateAudio, { capture: true });
      window.removeEventListener("keydown", activateAudio, { capture: true });
    };
  }, [attemptPlay, paused, source, status]);

  if (!currentTrack) return null;

  return (
    <audio
      ref={audioRef}
      src={source}
      autoPlay={!paused}
      preload="auto"
      onCanPlay={() => {
        if (!paused && status !== "playing") void attemptPlay();
      }}
      onPlay={() => reportStatus("playing")}
      onPause={() => {
        if (paused) reportStatus("paused");
      }}
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
