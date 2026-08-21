import type { MediaItem, PlaylistTrack } from "../types/memorial";
import { resolveMediaUrl, type StorageBackedMedia } from "../services/mediaUrlService";

const CACHE_NAME = "memorial-player-media-v1";

type CacheableMedia = Pick<MediaItem | PlaylistTrack, "url" | "storagePath">;

const objectUrls = new Set<string>();
const objectUrlBySource = new Map<string, string>();

async function runWithConcurrency<T>(items: T[], concurrency: number, task: (item: T) => Promise<void>) {
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await task(item);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
}

async function cachedObjectUrl(cache: Cache, url: string) {
  const existingObjectUrl = objectUrlBySource.get(url);
  if (existingObjectUrl) return existingObjectUrl;

  try {
    const response = await cache.match(url);
    if (!response) return url;
    const objectUrl = URL.createObjectURL(await response.blob());
    objectUrls.add(objectUrl);
    objectUrlBySource.set(url, objectUrl);
    return objectUrl;
  } catch {
    return url;
  }
}

export async function cacheMedia(items: CacheableMedia[]) {
  const resolvedItems = await Promise.all(
    items.map(async (item) => ({
      item,
      resolvedUrl: await resolveMediaUrl(item as StorageBackedMedia).catch(() => item.url),
    })),
  );

  if (!("caches" in window)) {
    const resolved = new Map<string, string>();
    resolvedItems.forEach(({ item, resolvedUrl }) => {
      if (item.url) resolved.set(item.url, resolvedUrl);
      if (item.storagePath) resolved.set(item.storagePath, resolvedUrl);
    });
    return resolved;
  }

  const allSameOrigin = resolvedItems.every(({ resolvedUrl }) => {
    try {
      return new URL(resolvedUrl).origin === window.location.origin;
    } catch {
      return false;
    }
  });

  if (!allSameOrigin) {
    const resolved = new Map<string, string>();
    resolvedItems.forEach(({ item, resolvedUrl }) => {
      if (item.url) resolved.set(item.url, resolvedUrl);
      if (item.storagePath) resolved.set(item.storagePath, resolvedUrl);
    });
    return resolved;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const resolved = new Map<string, string>();
    const targetUrls = new Map<string, string>();
    const uniqueResolvedUrls = [...new Set(resolvedItems.map(({ resolvedUrl }) => resolvedUrl).filter(Boolean))];

    await runWithConcurrency(uniqueResolvedUrls, 2, async (resolvedUrl) => {
      let targetUrl = resolvedUrl;
      try {
        const cached = await cache.match(resolvedUrl);
        if (!cached) {
          try {
            await cache.add(resolvedUrl);
          } catch {
            // A failed media download should not stop playback; use remote URL as fallback.
          }
        }
        targetUrl = await cachedObjectUrl(cache, resolvedUrl);
      } catch {
        targetUrl = resolvedUrl;
      }
      targetUrls.set(resolvedUrl, targetUrl);
    });

    resolvedItems.forEach(({ item, resolvedUrl }) => {
      if (!resolvedUrl) return;
      const targetUrl = targetUrls.get(resolvedUrl) ?? resolvedUrl;
      if (item.url) resolved.set(item.url, targetUrl);
      if (item.storagePath) resolved.set(item.storagePath, targetUrl);
    });

    return resolved;
  } catch {
    const resolved = new Map<string, string>();
    resolvedItems.forEach(({ item, resolvedUrl }) => {
      if (item.url) resolved.set(item.url, resolvedUrl);
      if (item.storagePath) resolved.set(item.storagePath, resolvedUrl);
    });
    return resolved;
  }
}

export function revokeCachedObjectUrls() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
  objectUrlBySource.clear();
}

export async function clearOldMedia(keepUrls: string[]) {
  if (!("caches" in window)) return;
  const keep = new Set(keepUrls);
  objectUrlBySource.forEach((_objectUrl, sourceUrl) => keep.add(sourceUrl));
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  await Promise.all(
    requests.map((request) => {
      if (keep.has(request.url)) return Promise.resolve(false);
      return cache.delete(request);
    }),
  );
}
