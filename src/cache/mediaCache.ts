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

function isMediaResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  return response.status === 200 && !/text\/html|application\/(?:json|xml)|text\/xml/i.test(contentType);
}

async function materializedObjectUrl(url: string, cache: Cache | null) {
  const existingObjectUrl = objectUrlBySource.get(url);
  if (existingObjectUrl) return existingObjectUrl;

  try {
    let response = await cache?.match(url).catch(() => undefined);
    if (response && !isMediaResponse(response)) {
      await cache?.delete(url).catch(() => false);
      response = undefined;
    }
    if (!response) {
      // Bypass HTTP-cached redirects to temporary Storage download URLs.
      response = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" });
      if (!isMediaResponse(response)) return url;
      // Storage quota/private mode must not discard a successful download.
      await cache?.put(url, response.clone()).catch(() => undefined);
    }
    const blob = await response.blob();
    if (!blob.size) return url;
    const objectUrl = URL.createObjectURL(blob);
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

  let cache: Cache | null = null;
  try {
    if ("caches" in window) cache = await caches.open(CACHE_NAME);
  } catch {
    // Downloads remain usable even when persistent storage is unavailable.
  }

  const resolved = new Map<string, string>();
  const targetUrls = new Map<string, string>();
  const uniqueResolvedUrls = [...new Set(resolvedItems.map(({ resolvedUrl }) => resolvedUrl).filter(Boolean))];

  await runWithConcurrency(uniqueResolvedUrls, 2, async (resolvedUrl) => {
    targetUrls.set(resolvedUrl, await materializedObjectUrl(resolvedUrl, cache));
  });

  resolvedItems.forEach(({ item, resolvedUrl }) => {
    const targetUrl = targetUrls.get(resolvedUrl) ?? resolvedUrl;
    if (item.url) resolved.set(item.url, targetUrl);
    if (item.storagePath) resolved.set(item.storagePath, targetUrl);
  });
  return resolved;
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
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    await Promise.all(
      requests.map((request) => {
        if (keep.has(request.url)) return Promise.resolve(false);
        return cache.delete(request);
      }),
    );
  } catch {
    // Best-effort cleanup: storage failures must not interrupt playback.
  }
}
