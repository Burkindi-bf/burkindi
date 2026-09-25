/* Burkindi — service worker : fonctionnement hors ligne et mises à jour.
   À CHAQUE NOUVELLE VERSION : changer VERSION ci-dessous (même numéro que
   VERSION_APP dans index.html). C'est ce changement qui fait apparaître,
   chez les utilisateurs, le message « Nouvelle version disponible ». */
const VERSION = "23";
const CACHE = "burkindi-v" + VERSION;
const FICHIERS = [
  "./index.html",
  "./manifest.webmanifest",
  "./icone-192.png",
  "./icone-512.png",
  "./icone-maskable-192.png",
  "./icone-maskable-512.png",
  "./icone-apple-180.png",
  "./icone-32.png"
];

/* Installation : tous les fichiers sont téléchargés d'un coup (en ignorant le
   cache du navigateur). Si un seul manque, la nouvelle version n'est pas
   installée et l'ancienne continue de fonctionner. Pas de skipWaiting ici :
   la nouvelle version attend que l'utilisateur la demande. */
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FICHIERS.map(function (f) {
      return fetch(new Request(f, { cache: "reload" })).then(function (r) {
        if (!r.ok) throw new Error(f + " : " + r.status);
        return c.put(f, r);
      });
    }));
  }));
});

/* Activation (après accord de l'utilisateur) : les anciennes versions sont effacées. */
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("burkindi-") === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("message", function (e) {
  const d = e.data || {};
  if (d.type === "MISE_A_JOUR") self.skipWaiting();
  else if (d.type === "VERSION" && e.ports && e.ports[0]) e.ports[0].postMessage(VERSION);
});

/* Tout est servi depuis l'appareil ; internet ne sert qu'aux mises à jour. */
self.addEventListener("fetch", function (e) {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(r, { ignoreSearch: true }).then(function (m) {
      if (m) return m;
      if (r.mode === "navigate") return c.match("./index.html").then(function (x) { return x || fetch(r); });
      return fetch(r);
    });
  }));
});
