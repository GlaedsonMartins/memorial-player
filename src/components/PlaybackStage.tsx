import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaybackItem, SlideDuration } from "../types/memorial";

export function PlaybackStage({
  queue,
  slideDuration,
  onVideoModeChange,
}: {
  queue: PlaybackItem[];
  slideDuration: SlideDuration;
  onVideoModeChange: (active: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [heldItem, setHeldItem] = useState<PlaybackItem | null>(null);
  const current = queue[index % Math.max(queue.length, 1)] ?? heldItem;
  const currentRef = useRef<PlaybackItem | null>(current);
  const next = useMemo(() => queue[(index + 1) % Math.max(queue.length, 1)], [index, queue]);

  useEffect(() => {
    if (current) {
      currentRef.current = current;
      setHeldItem(current);
    }
  }, [current]);

  useEffect(() => {
    if (index >= queue.length) setIndex(0);
  }, [index, queue.length]);

  useEffect(() => {
    if (!current || current.type !== "image") return;
    onVideoModeChange(false);
    const timeout = window.setTimeout(() => {
      setHeldItem(null);
      setIndex((value) => (value + 1) % queue.length);
    }, slideDuration * 1000);
    return () => window.clearTimeout(timeout);
  }, [current, onVideoModeChange, queue.length, slideDuration]);

  if (!current) return null;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {next?.type === "image" && (
        <img src={next.cachedUrl} alt="" className="hidden" draggable={false} />
      )}
      {current.type === "image" ? (
        <img
          key={current.id}
          src={current.cachedUrl}
          alt=""
          className="player-fade-enter h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <video
          key={current.id}
          src={current.cachedUrl}
          className="h-full w-full object-contain"
          autoPlay
          playsInline
          preload="auto"
          onPlay={() => onVideoModeChange(true)}
          onEnded={() => {
            onVideoModeChange(false);
            setHeldItem(null);
            setIndex((value) => (value + 1) % queue.length);
          }}
          onError={() => {
            onVideoModeChange(false);
            setHeldItem(null);
            setIndex((value) => (value + 1) % queue.length);
          }}
        />
      )}
    </main>
  );
}
