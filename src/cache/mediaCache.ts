import type { MediaItem, PlaylistTrack } from "../types/memorial";

const CACHE_NAME = "memorial-player-media-v1";

type CacheableMedia = Pick<MediaItem | PlaylistTrack, "url">;

const objectUrls = new Set<string>();

async function cachedObjectUrl(cache: Cache, url: string) {
  try {
    const response = await cache.match(url);
    if (!response) return url;
    const objectUrl = URL.createObjectURL(await response.blob());
    objectUrls.add(objectUrl);
    return objectUrl;
  } catch {
    return url;
  }
}

export async function cacheMedia(items: CacheableMedia[]) {
  if (!("caches" in window)) {
    return new Map<string, string>(items.map((item) => [item.url, item.url]));
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const resolved = new Map<string, string>();

    await Promise.all(
      items.map(async (item) => {
        if (!item.url) return;
        try {
          const cached = await cache.match(item.url);
          if (!cached) {
            try {
              await cache.add(item.url);
            } catch {
              // A failed media download should not stop playback; use remote URL as fallback.
            }
          }
          resolved.set(item.url, await cachedObjectUrl(cache, item.url));
        } catch {
          resolved.set(item.url, item.url);
        }
      }),
    );

    return resolved;
  } catch {
    return new Map<string, string>(items.map((item) => [item.url, item.url]));
  }
}

export function revokeCachedObjectUrls() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
}

export async function clearOldMedia(keepUrls: string[]) {
  if (!("caches" in window)) return;
  const keep = new Set(keepUrls);
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  await Promise.all(
    requests.map((request) => {
      if (keep.has(request.url)) return Promise.resolve(false);
      return cache.delete(request);
    }),
  );
}
