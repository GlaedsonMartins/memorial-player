import type { MediaItem, PlaybackItem } from "../types/memorial";

function byOrder(a: MediaItem, b: MediaItem) {
  return a.order - b.order;
}

function normalizeMediaItem(item: MediaItem, defaultType: "image" | "video"): MediaItem {
  return {
    ...item,
    type: item.type === "video" ? "video" : defaultType,
  };
}

export function buildPlaybackQueue(
  photos: MediaItem[],
  videos: MediaItem[],
  cachedUrls: Map<string, string>,
): PlaybackItem[] {
  const normalizedPhotos = photos.map((item) => normalizeMediaItem(item, "image"));
  const normalizedVideos = videos.map((item) => normalizeMediaItem(item, "video"));

  return [...normalizedPhotos.slice().sort(byOrder), ...normalizedVideos.slice().sort(byOrder)].map((item) => {
    const cachedUrl = cachedUrls.get(item.url) ?? cachedUrls.get(item.storagePath) ?? item.url ?? item.storagePath;
    return {
      ...item,
      cachedUrl,
    };
  });
}
