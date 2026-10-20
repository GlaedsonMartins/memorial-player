import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const source = ts.transpileModule(readFileSync(new URL("../src/cache/mediaCache.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const url = "https://firebasestorage.googleapis.com/example.jpg?token=test";
const items = [{ url, storagePath: "photos/example.jpg" }];
const media = () => new Response("photo-bytes", { headers: { "content-type": "image/jpeg" } });

function setup({ unavailable = false, quota = false, seed, download = async () => media() } = {}) {
  const entries = new Map(seed ? [[url, seed]] : []);
  const calls = [];
  const cache = {
    match: async (key) => entries.get(key)?.clone(),
    put: async (key, response) => {
      if (quota) throw new Error("quota");
      entries.set(key, response.clone());
    },
    delete: async (key) => entries.delete(key),
    keys: async () => [...entries.keys()].map((key) => ({ url: key })),
  };
  const caches = { open: async () => {
    if (unavailable) throw new Error("storage unavailable");
    return cache;
  } };
  const exports = {};
  vm.runInNewContext(source, {
    exports, window: { caches }, caches,
    require: () => ({ resolveMediaUrl: async (item) => item.url }),
    URL, fetch: async (...args) => { calls.push(args); return download(...args); },
  });
  return { ...exports, entries, calls };
}

test("external download persists and works offline after releasing memory URLs", async () => {
  const api = setup({ download: async () => {
    if (api.calls.length > 1) throw new Error("offline");
    return media();
  } });
  const first = await api.cacheMedia(items);
  assert.match(first.get(url), /^blob:/);
  assert.equal(first.get(items[0].storagePath), first.get(url));
  assert.equal(api.calls[0][1].cache, "no-store");
  api.revokeCachedObjectUrls();
  const second = await api.cacheMedia(items);
  assert.match(second.get(url), /^blob:/);
  assert.equal(api.calls.length, 1);
  api.revokeCachedObjectUrls();
});

for (const options of [{ quota: true }, { unavailable: true }]) {
  test(`successful download survives storage failure: ${JSON.stringify(options)}`, async () => {
    const api = setup(options);
    assert.match((await api.cacheMedia(items)).get(url), /^blob:/);
    await api.clearOldMedia([]);
    api.revokeCachedObjectUrls();
  });
}

test("HTML cached as a photo is discarded and downloaded again", async () => {
  const api = setup({ seed: new Response("<html>app</html>", { headers: { "content-type": "text/html" } }) });
  assert.match((await api.cacheMedia(items)).get(url), /^blob:/);
  assert.equal(api.calls.length, 1);
  assert.equal(api.entries.get(url).headers.get("content-type"), "image/jpeg");
  api.revokeCachedObjectUrls();
});

for (const [label, download] of [
  ["CORS/network failure", async () => { throw new TypeError("Failed to fetch"); }],
  ["HTML fallback", async () => new Response("<html>app</html>", { headers: { "content-type": "text/html" } })],
  ["partial response", async () => new Response("partial", { status: 206 })],
]) {
  test(`${label} preserves direct playback URL without poisoning cache`, async () => {
    const api = setup({ download });
    assert.equal((await api.cacheMedia(items)).get(url), url);
    assert.equal(api.entries.size, 0);
  });
}

test("duplicate media is downloaded once", async () => {
  const api = setup();
  await api.cacheMedia([...items, ...items]);
  assert.equal(api.calls.length, 1);
  api.revokeCachedObjectUrls();
});
