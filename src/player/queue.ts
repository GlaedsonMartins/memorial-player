import type { MediaItem, PlaybackItem } from "../types/memorial";

function byOrder(a: MediaItem, b: MediaItem) {
  return a.order - b.order;
}

export function buildPlaybackQueue(
  photos: MediaItem[],
  videos: MediaItem[],
  cachedUrls: Map<string, string>,
): PlaybackItem[] {
  return [...photos.slice().sort(byOrder), ...videos.slice().sort(byOrder)].map((item) => ({
    ...item,
    cachedUrl: cachedUrls.get(item.url) ?? item.url,
  }));
}
