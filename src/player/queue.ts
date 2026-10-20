import type { MediaItem, PlaybackItem } from "../types/memorial";

function byOrder(a: MediaItem, b: MediaItem) {
  return a.order - b.order;
}

function normalizeMediaItem(item: MediaItem, defaultType: "image" | "video"): MediaItem {
  return {
    ...item,
    // Older Cloud documents may not have a type. Photos/videos are already
    // separated by their parent array, so the parent is the safe fallback.
    type: item.type === "video" ? "video" : defaultType,
    url: typeof item.url === "string" ? item.url.trim() : "",
    storagePath: typeof item.storagePath === "string" ? item.storagePath.trim() : "",
  };
}

export function buildPlaybackQueue(
  photos: MediaItem[],
  videos: MediaItem[],
  cachedUrls: Map<string, string>,
): PlaybackItem[] {
  const normalizedPhotos = photos
    .map((item) => normalizeMediaItem(item, "image"))
    .filter((item) => item.url || item.storagePath);
  const normalizedVideos = videos
    .map((item) => normalizeMediaItem(item, "video"))
    .filter((item) => item.url || item.storagePath);

  return [...normalizedPhotos.slice().sort(byOrder), ...normalizedVideos.slice().sort(byOrder)].map((item) => {
    const cachedUrl = cachedUrls.get(item.url) ?? cachedUrls.get(item.storagePath) ?? item.url ?? item.storagePath;
    return {
      ...item,
      cachedUrl,
    };
  });
}
