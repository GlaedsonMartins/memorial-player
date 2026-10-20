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
  const [transitionIndex, setTransitionIndex] = useState(0);
  const [transitionReady, setTransitionReady] = useState(false);
  const readyPartsRef = useRef(new Set<string>());
  const failedItemsRef = useRef(new Set<string>());
  const preparationRef = useRef(0);
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
  const isSingleImage = queue.length === 1 && isImagePlaybackItem(queue[0]);
  const playbackToken = current ? `${index}:${current.id}:${current.cachedUrl}` : "";

  const prepareTransition = useCallback((item: PlaybackItem, itemIndex: number) => {
    preparationRef.current += 1;
    readyPartsRef.current.clear();
    setTransitionReady(false);
    setTransitionIndex(itemIndex);
    setTransitionItem(item);
  }, []);

  const advance = useCallback((token: string) => {
    if (
      queue.length < 2 ||
      isSingleImage ||
      activePlaybackTokenRef.current !== token ||
      advanceLockRef.current === token
    ) return;
    advanceLockRef.current = token;
    const nextItem = queue[(index + 1) % queue.length];
    if (!nextItem) return;
    failedItemsRef.current.clear();
    prepareTransition(nextItem, (index + 1) % queue.length);
  }, [index, isSingleImage, prepareTransition, queue]);

  const skipFailedTransition = useCallback(() => {
    if (!transitionItem) return;
    failedItemsRef.current.add(`${transitionItem.id}:${transitionItem.cachedUrl}`);
    for (let offset = 1; offset < queue.length; offset += 1) {
      const candidateIndex = (transitionIndex + offset) % queue.length;
      const candidate = queue[candidateIndex];
      if (candidateIndex === index || failedItemsRef.current.has(`${candidate.id}:${candidate.cachedUrl}`)) continue;
      prepareTransition(candidate, candidateIndex);
      return;
    }
    // Keep the last displayed slide when every alternative fails.
    setTransitionReady(false);
    setTransitionItem(null);
    advanceLockRef.current = null;
  }, [index, prepareTransition, queue, transitionIndex, transitionItem]);

  useEffect(() => {
    if (!transitionItem || isSingleImage) return;
    if (!transitionReady) {
      const timeout = window.setTimeout(skipFailedTransition, 15000);
      return () => window.clearTimeout(timeout);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      setTransitionItem(null);
      setTransitionReady(false);
      setHeldItem(null);
      setIndex(transitionIndex);
      advanceLockRef.current = null;
    }, TRANSITION_MS);
    return () => {
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    };
  }, [isSingleImage, skipFailedTransition, transitionIndex, transitionItem, transitionReady]);

  useEffect(() => {
    if (!transitionItem) return;
    const newIndex = queue.findIndex((item) => item.id === transitionItem.id && item.cachedUrl === transitionItem.cachedUrl);
    if (newIndex >= 0) {
      setTransitionIndex(newIndex);
    } else {
      setTransitionItem(null);
      setTransitionReady(false);
      advanceLockRef.current = null;
    }
  }, [queue, transitionItem]);

  useEffect(() => {
    if (!isSingleImage) return;
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    advanceLockRef.current = null;
    setTransitionItem(null);
    setTransitionReady(false);
  }, [isSingleImage]);

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
    if (isSingleImage || !isImagePlaybackItem(current) || transitionItem) return;
    const timeout = window.setTimeout(() => {
      advance(playbackToken);
    }, slideDuration * 1000);
    return () => window.clearTimeout(timeout);
  }, [advance, current, isSingleImage, playbackToken, slideDuration, transitionItem]);

  const startVideoIfReady = useCallback(() => {
    const video = videoRef.current;
    if (!video || currentIsImage || videoStartedRef.current) return;
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
  }, [currentIsImage]);

  const handleVideoEnded = useCallback(() => {
    if (transitionItem) return;
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
  }, [advance, playbackToken, queue.length, transitionItem]);

  const startTransitionVideoIfReady = useCallback(() => {
    const video = transitionVideoRef.current;
    if (!video || !transitionItem || transitionItem.type !== "video") return;
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return;
    video.muted = true;
    readyPartsRef.current.add("foreground");
    if (readyPartsRef.current.has("background")) setTransitionReady(true);
    void video.play().catch((error: unknown) => {
      if (import.meta.env.DEV) console.debug("[PlaybackStage] transition video deferred", error);
    });
  }, [transitionItem]);

  useEffect(() => {
    videoStartedRef.current = false;
    videoReadySinceRef.current = null;
    const video = videoRef.current;
    if (!video || currentIsImage) return;

    // The incoming DOM node is promoted intact: never reload or rewind it here.
    startVideoIfReady();
    videoPollRef.current = window.setInterval(startVideoIfReady, 150);
    return () => {
      if (videoPollRef.current !== null) {
        window.clearInterval(videoPollRef.current);
        videoPollRef.current = null;
      }
    };
  }, [currentIsImage, mediaToken, startVideoIfReady]);

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
    startTransitionVideoIfReady();
  }, [startTransitionVideoIfReady, transitionItem]);

  if (!current) return null;

  const effect = getPresentationEffect(index);
  const transitionEffect = getPresentationEffect(transitionIndex);
  const durationStyle = { "--player-media-duration": `${slideDuration}s` } as CSSProperties;

  function renderMedia(item: PlaybackItem, layer: "current" | "transition") {
    const isTransition = layer === "transition";
    const itemEffect = isTransition ? transitionEffect : effect;
    const foregroundClass = isSingleImage
      ? "player-media player-static"
      : `player-media player-media-${itemEffect}`;
    const backgroundClass = `player-backdrop${isSingleImage ? " player-static" : ""}`;
    const slideClass = isSingleImage ? "" : isTransition
      ? transitionReady ? "player-slide-enter" : "player-slide-preparing"
      : "";
    const mediaStyle = { ...durationStyle, animationPlayState: isTransition ? "paused" : "running" } as CSSProperties;

    const markReady = (part: string) => {
      if (!isTransition || transitionReady) return;
      readyPartsRef.current.add(part);
      if (readyPartsRef.current.has("foreground") && readyPartsRef.current.has("background")) setTransitionReady(true);
    };
    const imageLoaded = async (image: HTMLImageElement, part: string) => {
      if (!isTransition) return;
      const preparation = preparationRef.current;
      try {
        await image.decode();
        if (image.isConnected && preparation === preparationRef.current) markReady(part);
      } catch {
        if (image.isConnected && preparation === preparationRef.current) skipFailedTransition();
      }
    };

    return (
      <div
        key={`${item.id}:${item.cachedUrl}`}
        className={`player-slide absolute inset-0 overflow-hidden ${slideClass}`}
        style={{ "--player-transition-duration": `${TRANSITION_MS}ms`, zIndex: isTransition ? 2 : 1 } as CSSProperties}
        aria-hidden={isTransition}
      >
        {item.type === "image" ? (
          <img src={item.cachedUrl} alt="" className={backgroundClass} draggable={false}
            onLoad={(event) => void imageLoaded(event.currentTarget, "background")}
            onError={isTransition ? skipFailedTransition : undefined} />
        ) : (
          <video
            src={item.cachedUrl}
            className={backgroundClass}
            muted
            autoPlay
            playsInline
            preload="auto"
            aria-hidden="true"
            onLoadedData={() => markReady("background")}
            onError={isTransition ? skipFailedTransition : undefined}
          />
        )}
        {item.type === "image" ? (
          <img
            src={item.cachedUrl}
            alt=""
            className={foregroundClass}
            style={mediaStyle}
            draggable={false}
            onLoad={(event) => void imageLoaded(event.currentTarget, "foreground")}
            onError={() => isTransition ? skipFailedTransition() : advance(playbackToken)}
          />
        ) : (
          <video
            src={item.cachedUrl}
            className={foregroundClass}
            style={mediaStyle}
            muted={isTransition || item.videoMuted !== false}
            playsInline
            preload="auto"
            ref={isTransition ? transitionVideoRef : videoRef}
            onLoadedData={isTransition ? startTransitionVideoIfReady : startVideoIfReady}
            onCanPlay={isTransition ? startTransitionVideoIfReady : startVideoIfReady}
            onCanPlayThrough={isTransition ? startTransitionVideoIfReady : startVideoIfReady}
            onProgress={isTransition ? startTransitionVideoIfReady : startVideoIfReady}
            onEnded={isTransition ? undefined : handleVideoEnded}
            onError={() => isTransition ? skipFailedTransition() : advance(playbackToken)}
          />
        )}
      </div>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {!isSingleImage && isImagePlaybackItem(next) && <img src={next.cachedUrl} alt="" className="hidden" draggable={false} />}
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
      {[
        renderMedia(current, "current"),
        ...(!isSingleImage && transitionItem ? [renderMedia(transitionItem, "transition")] : []),
      ]}
    </main>
  );
}
