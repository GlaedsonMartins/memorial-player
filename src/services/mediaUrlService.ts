import { getDownloadURL, ref } from "firebase/storage";
import { getFirebaseStorage } from "../firebase/client";

export interface StorageBackedMedia {
  url?: string | null;
  storagePath?: string | null;
}

function hasScheme(value: string) {
  return /^[a-z][a-z\d+.-]*:/i.test(value);
}

function isUsableBrowserUrl(value: string) {
  return value.startsWith("/") || value.startsWith("blob:") || value.startsWith("data:");
}

function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function looksLikeStoragePath(value: string) {
  return value.startsWith("gs://") || (!hasScheme(value) && !value.startsWith("/"));
}

export async function resolveMediaUrl(item: StorageBackedMedia) {
  const url = item.url?.trim() ?? "";
  const storagePath = item.storagePath?.trim() ?? "";
  const candidate = storagePath || (looksLikeStoragePath(url) ? url : "");

  if (candidate) {
    try {
      return await getDownloadURL(ref(getFirebaseStorage(), candidate));
    } catch (error) {
      if (!url || !isHttpUrl(url)) throw error;
    }
  }

  if (url && (isHttpUrl(url) || isUsableBrowserUrl(url))) return url;
  return url || storagePath;
}
