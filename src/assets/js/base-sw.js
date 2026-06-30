export function initSw(CACHE_TAG, PRECACHE_URLS, version) {
  const CACHE_NAME = `${CACHE_TAG}-${version}`;

  // ========== install：预缓存关键资源 ==========
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] 预缓存资源中...');
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn('[SW] 部分资源预缓存失败（不影响安装）:', err);
        });
      })
    );
    // 立即激活，不等待旧 SW 释放页面
    self.skipWaiting();
  });

// ========== activate：清理旧版本缓存 ==========
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith(CACHE_TAG) && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] 清除旧缓存:', name);
              return caches.delete(name);
            })
        );
      })
    );
    // 让新 SW 立即接管所有页面
    self.clients.claim();
  });

// ========== fetch：网络优先，失败回退缓存 ==========
  self.addEventListener('fetch', (event) => {
    // 只处理 GET 请求
    if (event.request.method !== 'GET') return;

    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            // 网络成功，更新缓存
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          }
          // 网络返回非 200，尝试回退缓存
          const cache = await getCache(event);
          return cache.status === 408 ? networkResponse : cache;
        } catch (_) {
          // 网络失败，回退缓存
          return await getCache(event);
        }
      })()
    );
  });

  async function getCache(event) {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // 没网也没缓存
    if (event.request.destination === 'document') {
      return new Response(
        '<html><body style="text-align:center;padding-top:80px;font-family:sans-serif;">'
        + '<h1>📡 当前离线</h1><p>请连接网络后重试</p></body></html>',
        {headers: {'Content-Type': 'text/html'}}
      );
    }
    return new Response('', {status: 408});
  }

}