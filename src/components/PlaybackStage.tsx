import { useEffect, useMemo, useState } from "react";
import type { PlaybackItem, SlideDuration } from "../types/memorial";

function isImagePlaybackItem(item: PlaybackItem | null | undefined) {
  if (!item) return false;
  if (item.type === "image") return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg|avif|ico|heic|heif)(\?.*)?$/i.test(item.cachedUrl);
}

export function PlaybackStage({
  queue,
  slideDuration,
  onCurrentItemChange,
}: {
  queue: PlaybackItem[];
  slideDuration: SlideDuration;
  onCurrentItemChange: (item: PlaybackItem | null) => void;
}) {
  const [index, setIndex] = useState(0);
  const [heldItem, setHeldItem] = useState<PlaybackItem | null>(null);
  const current = queue[index % Math.max(queue.length, 1)] ?? heldItem;
  const next = useMemo(() => queue[(index + 1) % Math.max(queue.length, 1)], [index, queue]);

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
      setHeldItem(null);
      setIndex((value) => (value + 1) % queue.length);
    }, slideDuration * 1000);
    return () => window.clearTimeout(timeout);
  }, [current, queue.length, slideDuration]);

  if (!current) return null;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {isImagePlaybackItem(next) && (
        <img src={next.cachedUrl} alt="" className="hidden" draggable={false} />
      )}
      {isImagePlaybackItem(current) ? (
        <img
          key={current.id}
          src={current.cachedUrl}
          alt=""
          className="player-fade-enter h-full w-full object-contain"
          draggable={false}
          onError={() => {
            setHeldItem(null);
            setIndex((value) => (value + 1) % queue.length);
          }}
        />
      ) : (
        <video
          key={current.id}
          src={current.cachedUrl}
          className="h-full w-full object-contain"
          autoPlay
          muted={current.videoMuted !== false}
          playsInline
          preload="auto"
          onEnded={() => {
            setHeldItem(null);
            setIndex((value) => (value + 1) % queue.length);
          }}
          onError={() => {
            setHeldItem(null);
            setIndex((value) => (value + 1) % queue.length);
          }}
        />
      )}
    </main>
  );
}
