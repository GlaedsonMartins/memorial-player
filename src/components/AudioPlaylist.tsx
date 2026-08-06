import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaylistTrack } from "../types/memorial";

export function AudioPlaylist({
  tracks,
  cachedTracks,
  paused,
}: {
  tracks: PlaylistTrack[];
  cachedTracks: Map<string, string>;
  paused: boolean;
}) {
  const orderedTracks = useMemo(() => tracks.slice().sort((a, b) => a.order - b.order), [tracks]);
  const [index, setIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = orderedTracks[index];

  useEffect(() => {
    if (!audioRef.current) return;
    if (paused) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play().catch(() => undefined);
    }
  }, [paused, currentTrack?.url]);

  if (!currentTrack) return null;

  return (
    <audio
      ref={audioRef}
      src={cachedTracks.get(currentTrack.url) ?? currentTrack.url}
      autoPlay={!paused}
      preload="auto"
      onEnded={() => setIndex((current) => (current + 1) % orderedTracks.length)}
    />
  );
}
