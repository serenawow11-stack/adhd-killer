const CACHE = "adhd-killer-shell-v2";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("adhd-killer-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if(event.request.method !== "GET" || url.origin !== self.location.origin) return;
 const paths = ASSETS.map(path => new URL(path,self.registration.scope).href);
 if(!paths.includes(url.href)) return;
 event.respondWith(caches.open(CACHE).then(async cache => {
  const cached=await cache.match(event.request);
  return cached || fetch(event.request);
 }));
});
