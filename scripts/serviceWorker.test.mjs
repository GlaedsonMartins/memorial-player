import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const origin = "https://memorial-player.vercel.app";

function setup({ online = false, quota = false } = {}) {
  const handlers = {};
  const cache = {
    match: async () => undefined,
    put: async () => { if (quota) throw new Error("quota"); },
  };
  vm.runInNewContext(source, {
    self: { location: { origin }, addEventListener: (name, handler) => { handlers[name] = handler; } },
    URL, Response,
    caches: { open: async () => cache, match: async (key) => key === "/" ? new Response("app shell") : undefined },
    fetch: async () => { if (!online) throw new Error("offline"); return new Response("photo"); },
  });
  return (request) => {
    let response;
    handlers.fetch({ request: { method: "GET", mode: "cors", destination: "", headers: new Headers(), ...request }, respondWith: (value) => { response = value; } });
    return response;
  };
}

test("external Firebase downloads and APIs bypass the service worker", () => {
  const dispatch = setup();
  assert.equal(dispatch({ url: "https://firebasestorage.googleapis.com/photo" }), undefined);
  assert.equal(dispatch({ url: "https://firestore.googleapis.com/api" }), undefined);
});

test("offline navigation gets the app shell, failed media fetch does not", async () => {
  const dispatch = setup();
  assert.equal(await (await dispatch({ url: `${origin}/room`, mode: "navigate" })).text(), "app shell");
  assert.equal((await dispatch({ url: `${origin}/photo` })).type, "error");
});

test("cache quota cannot turn successful media download into a failure", async () => {
  const dispatch = setup({ online: true, quota: true });
  assert.equal(await (await dispatch({ url: `${origin}/photo`, destination: "image" })).text(), "photo");
});

test("range requests bypass full-file cache", () => {
  const dispatch = setup();
  assert.equal(dispatch({ url: `${origin}/video`, destination: "video", headers: new Headers({ Range: "bytes=0-100" }) }), undefined);
});
