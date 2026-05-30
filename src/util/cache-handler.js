const CACHE_NAME = 'bopomo-assets-cache';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * A wrapper around fetch that caches responses using the browser Cache Storage API.
 * Within the TTL (default 24h), it serves the cached file instantly.
 * Once the TTL expires, it performs a lightweight HEAD request to check ETag/Last-Modified.
 * If unchanged, it updates the cache timestamp and returns the cached file.
 * If changed (or HEAD fails), it performs a full GET request and caches the new content.
 * If the network is offline or fails entirely, it falls back to the expired cached version.
 *
 * @param {string|Request} input - The URL or Request to fetch
 * @param {Object} [options] - Fetch options and caching config
 * @param {number} [options.ttl] - Time-to-live in milliseconds (default: 24 hours)
 * @returns {Promise<Response>}
 */
export async function cachedFetch(input, options = {}) {
  const url = typeof input === 'string' ? input : input.url;
  const { ttl = DEFAULT_TTL, ...fetchOptions } = options;

  // Fallback to normal fetch if caches is not supported (e.g. older browsers, private tabs)
  if (typeof window === 'undefined' || !window.caches) {
    return fetch(input, fetchOptions);
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(url);

    if (cachedResponse) {
      const cachedTimeStr = cachedResponse.headers.get('x-cache-timestamp');
      if (cachedTimeStr) {
        const cachedTime = parseInt(cachedTimeStr, 10);
        const age = Date.now() - cachedTime;

        if (!isNaN(age) && age < ttl) {
          console.log(`[Cache] Cache hit for ${url} (age: ${(age / 1000 / 60).toFixed(1)} mins)`);
          return cachedResponse.clone();
        }

        // TTL expired: Check if file has changed via HEAD request
        console.log(`[Cache] Cache expired for ${url} (age: ${(age / 1000 / 60 / 60).toFixed(1)} hours). Validating...`);
        let isChanged = true;
        const cachedEtag = cachedResponse.headers.get('etag');
        const cachedLastModified = cachedResponse.headers.get('last-modified');

        try {
          const headResponse = await fetch(url, { ...fetchOptions, method: 'HEAD' });
          if (headResponse.ok) {
            const serverEtag = headResponse.headers.get('etag');
            const serverLastModified = headResponse.headers.get('last-modified');

            // Compare ETags or Last-Modified timestamps
            if (serverEtag && cachedEtag && serverEtag === cachedEtag) {
              isChanged = false;
            } else if (serverLastModified && cachedLastModified && serverLastModified === cachedLastModified) {
              isChanged = false;
            }
          }
        } catch (headErr) {
          console.warn(`[Cache] HEAD validation failed for ${url}. Assuming changed/fetching full.`, headErr);
        }

        if (!isChanged) {
          console.log(`[Cache] Content unchanged for ${url}. Refreshing cache TTL.`);
          try {
            // Update x-cache-timestamp in cache without redownloading the body
            const blob = await cachedResponse.blob();
            const newHeaders = new Headers(cachedResponse.headers);
            newHeaders.set('x-cache-timestamp', Date.now().toString());

            const refreshedResponse = new Response(blob, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: newHeaders
            });

            await cache.put(url, refreshedResponse.clone());
            return refreshedResponse;
          } catch (updateErr) {
            console.warn(`[Cache] Failed to refresh cache headers for ${url}:`, updateErr);
            return cachedResponse.clone();
          }
        }
      }
    }

    // Cache miss or expired with changed content: Fetch from network
    console.log(`[Cache] Fetching full asset from network: ${url}`);
    try {
      const response = await fetch(input, fetchOptions);
      if (response.ok) {
        try {
          const blob = await response.clone().blob();
          const newHeaders = new Headers(response.headers);
          newHeaders.set('x-cache-timestamp', Date.now().toString());

          const responseToCache = new Response(blob, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });

          await cache.put(url, responseToCache);
          console.log(`[Cache] Cached ${url} successfully`);
        } catch (cacheErr) {
          console.warn(`[Cache] Failed to write cache for ${url}:`, cacheErr);
        }
      }
      return response;
    } catch (networkErr) {
      if (cachedResponse) {
        console.warn(`[Cache] Network fetch failed for ${url}. Returning expired cached response as fallback.`, networkErr);
        return cachedResponse.clone();
      }
      throw networkErr;
    }
  } catch (err) {
    console.warn(`[Cache] Cache operation error for ${url}, falling back to network fetch:`, err);
    return fetch(input, fetchOptions);
  }
}
