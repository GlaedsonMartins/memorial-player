import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

type PresentationEffect = "zoom-in" | "zoom-out" | "pan-horizontal" | "pan-vertical" | "focus";

const TRANSITION_MS = 900;
const PRESENTATION_EFFECTS: PresentationEffect[] = [
  "zoom-in",
  "pan-horizontal",
  "focus",
  "zoom-out",
  "pan-vertical",
];

function getPresentationEffect(index: number): PresentationEffect {
  return PRESENTATION_EFFECTS[index % PRESENTATION_EFFECTS.length];
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
  const [transitionItem, setTransitionItem] = useState<PlaybackItem | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transitionVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoStartedRef = useRef(false);
  const videoReadySinceRef = useRef<number | null>(null);
  const videoPollRef = useRef<number | null>(null);
  const advanceLockRef = useRef<string | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const activePlaybackTokenRef = useRef("");
  const current = queue[index % Math.max(queue.length, 1)] ?? heldItem;
  const next = useMemo(() => queue[(index + 1) % Math.max(queue.length, 1)], [index, queue]);
  const mediaToken = current ? `${current.id}:${current.cachedUrl}` : "";
  const currentIsImage = isImagePlaybackItem(current);
  const playbackToken = current ? `${index}:${current.id}:${current.cachedUrl}` : "";

  const advance = useCallback((token: string) => {
    if (
      queue.length === 0 ||
      activePlaybackTokenRef.current !== token ||
      advanceLockRef.current === token
    ) return;
    advanceLockRef.current = token;
    const nextItem = queue[(index + 1) % queue.length];
    if (!nextItem) return;
    setTransitionItem(nextItem);
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionItem(null);
      setHeldItem(null);
      setIndex((value) => (value + 1) % queue.length);
      advanceLockRef.current = null;
    }, TRANSITION_MS);
  }, [index, queue]);

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

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isImagePlaybackItem(current) || transitionItem) return;
    const timeout = window.setTimeout(() => {
      advance(playbackToken);
    }, slideDuration * 1000);
    return () => window.clearTimeout(timeout);
  }, [advance, current, playbackToken, slideDuration, transitionItem]);

  const startVideoIfReady = useCallback(() => {
    const video = videoRef.current;
    if (!video || currentIsImage || transitionItem || videoStartedRef.current) return;
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
  }, [currentIsImage, transitionItem]);

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

  const startTransitionVideoIfReady = useCallback(() => {
    const video = transitionVideoRef.current;
    if (!video || !transitionItem || transitionItem.type !== "video") return;
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return;
    video.muted = true;
    void video.play().catch((error: unknown) => {
      if (import.meta.env.DEV) console.debug("[PlaybackStage] transition video deferred", error);
    });
  }, [transitionItem]);

  useEffect(() => {
    videoStartedRef.current = false;
    videoReadySinceRef.current = null;
    const video = videoRef.current;
    if (!video || currentIsImage || transitionItem) return;

    video.load();
    videoPollRef.current = window.setInterval(startVideoIfReady, 150);
    return () => {
      if (videoPollRef.current !== null) {
        window.clearInterval(videoPollRef.current);
        videoPollRef.current = null;
      }
    };
  }, [currentIsImage, mediaToken, startVideoIfReady, transitionItem]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentIsImage) return;
    connectMediaElement(video);
    return () => disconnectMediaElement(video);
  }, [currentIsImage, mediaToken]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentIsImage) return;
    setMediaElementGain(video, audioSettings.masterVolume * audioSettings.videoVolume);
  }, [audioSettings, currentIsImage, mediaToken]);

  useEffect(() => {
    if (!transitionItem || transitionItem.type !== "video") return;
    const video = transitionVideoRef.current;
    if (!video) return;
    video.load();
    startTransitionVideoIfReady();
  }, [startTransitionVideoIfReady, transitionItem]);

  if (!current) return null;

  const effect = getPresentationEffect(index);
  const transitionEffect = getPresentationEffect(index + 1);
  const durationStyle = { "--player-media-duration": `${slideDuration}s` } as CSSProperties;

  function renderMedia(item: PlaybackItem, layer: "current" | "transition") {
    const isTransition = layer === "transition";
    const itemEffect = isTransition ? transitionEffect : effect;
    const foregroundClass = `player-media player-media-${itemEffect} ${isTransition ? "player-layer-enter" : "player-layer-current"}`;
    const backgroundClass = `player-backdrop ${isTransition ? "player-layer-enter" : "player-layer-current"}`;

    return (
      <div className="absolute inset-0 overflow-hidden" aria-hidden={isTransition}>
        {item.type === "image" ? (
          <img src={item.cachedUrl} alt="" className={backgroundClass} draggable={false} />
        ) : (
          <video
            src={item.cachedUrl}
            className={backgroundClass}
            muted
            autoPlay
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        )}
        {item.type === "image" ? (
          <img
            key={`${layer}-${item.id}-${item.cachedUrl}`}
            src={item.cachedUrl}
            alt=""
            className={foregroundClass}
            style={durationStyle}
            draggable={false}
            onError={() => !isTransition && advance(playbackToken)}
          />
        ) : (
          <video
            key={`${layer}-${item.id}-${item.cachedUrl}`}
            src={item.cachedUrl}
            className={foregroundClass}
            style={durationStyle}
            muted={isTransition || item.videoMuted !== false}
            playsInline
            preload="auto"
            ref={isTransition ? transitionVideoRef : videoRef}
            onLoadedData={isTransition ? startTransitionVideoIfReady : startVideoIfReady}
            onCanPlay={isTransition ? startTransitionVideoIfReady : startVideoIfReady}
            onCanPlayThrough={isTransition ? startTransitionVideoIfReady : startVideoIfReady}
            onProgress={isTransition ? startTransitionVideoIfReady : startVideoIfReady}
            onEnded={isTransition ? undefined : handleVideoEnded}
            onError={() => !isTransition && advance(playbackToken)}
          />
        )}
      </div>
    );
  }

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
      {renderMedia(current, "current")}
      {transitionItem && renderMedia(transitionItem, "transition")}
    </main>
  );
}
