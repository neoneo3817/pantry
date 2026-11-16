/* 살림살이 서비스워커 — 배포할 때마다 V 숫자를 올리면 캐시가 새로 만들어져요 */
const V = "salimsari-v1";
const SHELL = ["./", "index.html", "scanner.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.hostname.includes("openfoodfacts")) return;               // 상품 조회는 항상 네트워크
  const put = x => { if (x && (x.ok || x.type === "opaque")) { const cp = x.clone(); caches.open(V).then(c => c.put(r, cp)); } return x; };
  if (u.origin === location.origin) {                              // 내 파일: 온라인이면 최신, 오프라인이면 캐시
    e.respondWith(fetch(r).then(put).catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
  } else {                                                         // 글꼴·three.js 등 외부 파일: 캐시 우선
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(put)));
  }
});
