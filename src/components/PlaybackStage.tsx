import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AudioSettings, PlaybackItem, SlideDuration } from "../types/memorial";
import {
  connectMediaElement,
  disconnectMediaElement,
  resumeMediaAudio,
  setMediaElementGain,
} from "../services/mediaAudioService";

function isImagePlaybackItem(item: PlaybackItem | null | undefined) {
  return item?.type === "image";
}

function bufferedAhead(video: HTMLVideoElement) {
  for (let index = 0; index < video.buffered.length; index += 1) {
    if (video.buffered.start(index) <= video.currentTime && video.buffered.end(index) > video.currentTime) {
      return video.buffered.end(index) - video.currentTime;
    }
  }
  return 0;
}

export function PlaybackStage({
  queue,
  slideDuration,
  audioSettings,
  onCurrentItemChange,
}: {
  queue: PlaybackItem[];
  slideDuration: SlideDuration;
  audioSettings: AudioSettings;
  onCurrentItemChange: (item: PlaybackItem | null) => void;
}) {
  const [index, setIndex] = useState(0);
  const [heldItem, setHeldItem] = useState<PlaybackItem | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStartedRef = useRef(false);
  const videoReadySinceRef = useRef<number | null>(null);
  const videoPollRef = useRef<number | null>(null);
  const advanceLockRef = useRef<string | null>(null);
  const activePlaybackTokenRef = useRef("");
  const current = queue[index % Math.max(queue.length, 1)] ?? heldItem;
  const next = useMemo(() => queue[(index + 1) % Math.max(queue.length, 1)], [index, queue]);
  const playbackToken = current ? `${index}:${current.id}:${current.cachedUrl}` : "";

  const advance = useCallback((token: string) => {
    if (
      queue.length === 0 ||
      activePlaybackTokenRef.current !== token ||
      advanceLockRef.current === token
    ) return;
    advanceLockRef.current = token;
    setHeldItem(null);
    setIndex((value) => (value + 1) % queue.length);
  }, [queue.length]);

  useEffect(() => {
    activePlaybackTokenRef.current = playbackToken;
  }, [playbackToken]);

  useEffect(() => {
    if (current) {
      setHeldItem(current);
    }
  }, [current]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug("[PlaybackStage] current", current);
      console.debug("[PlaybackStage] next", next);
    }
  }, [current, next]);

  useEffect(() => {
    onCurrentItemChange(current ?? null);
  }, [current, onCurrentItemChange]);

  useEffect(() => {
    if (index >= queue.length) setIndex(0);
  }, [index, queue.length]);

  useEffect(() => {
    if (!isImagePlaybackItem(current)) return;
    const timeout = window.setTimeout(() => {
      advance(playbackToken);
    }, slideDuration * 1000);
    return () => window.clearTimeout(timeout);
  }, [advance, current, playbackToken, slideDuration]);

  const startVideoIfReady = useCallback(() => {
    const video = videoRef.current;
    if (!video || isImagePlaybackItem(current) || videoStartedRef.current) return;
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return;

    const readySince = videoReadySinceRef.current ?? Date.now();
    videoReadySinceRef.current = readySince;
    const hasEnoughBuffer = bufferedAhead(video) >= 1.25 || video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA;
    const waitedLongEnough = Date.now() - readySince >= 2500;
    if (!hasEnoughBuffer && !waitedLongEnough) return;

    videoStartedRef.current = true;
    if (videoPollRef.current !== null) {
      window.clearInterval(videoPollRef.current);
      videoPollRef.current = null;
    }
    void resumeMediaAudio(video)
      .then(() => video.play())
      .catch((error: unknown) => {
        videoStartedRef.current = false;
        if (import.meta.env.DEV) console.debug("[PlaybackStage] video play deferred", error);
      });
  }, [current]);

  const handleVideoEnded = useCallback(() => {
    if (queue.length !== 1) {
      advance(playbackToken);
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    videoStartedRef.current = false;
    videoReadySinceRef.current = Date.now();
    void resumeMediaAudio(video)
      .then(() => video.play())
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.debug("[PlaybackStage] single video replay deferred", error);
      });
  }, [advance, playbackToken, queue.length]);

  useEffect(() => {
    videoStartedRef.current = false;
    videoReadySinceRef.current = null;
    const video = videoRef.current;
    if (!video || isImagePlaybackItem(current)) return;

    video.load();
    videoPollRef.current = window.setInterval(startVideoIfReady, 150);
    return () => {
      if (videoPollRef.current !== null) {
        window.clearInterval(videoPollRef.current);
        videoPollRef.current = null;
      }
    };
  }, [current, startVideoIfReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isImagePlaybackItem(current)) return;
    connectMediaElement(video);
    return () => disconnectMediaElement(video);
  }, [current]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isImagePlaybackItem(current)) return;
    setMediaElementGain(video, audioSettings.masterVolume * audioSettings.videoVolume);
  }, [audioSettings, current]);

  if (!current) return null;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {isImagePlaybackItem(next) && <img src={next.cachedUrl} alt="" className="hidden" draggable={false} />}
      {!isImagePlaybackItem(next) && next?.cachedUrl !== current.cachedUrl && (
        <video
          key={`preload-${next.id}`}
          src={next.cachedUrl}
          className="pointer-events-none absolute h-px w-px opacity-0"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      )}
      {isImagePlaybackItem(current) ? (
        <img
          key={current.id}
          src={current.cachedUrl}
          alt=""
          className="player-fade-enter h-full w-full object-contain"
          draggable={false}
          onError={() => {
            advance(playbackToken);
          }}
        />
      ) : (
        <video
          key={current.id}
          src={current.cachedUrl}
          className="h-full w-full object-contain"
          muted={current.videoMuted !== false}
          playsInline
          preload="auto"
          ref={videoRef}
          onLoadedData={startVideoIfReady}
          onCanPlay={startVideoIfReady}
          onCanPlayThrough={startVideoIfReady}
          onProgress={startVideoIfReady}
          onEnded={handleVideoEnded}
          onError={() => advance(playbackToken)}
        />
      )}
    </main>
  );
}
