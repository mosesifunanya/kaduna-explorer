// Small process-local cache for public destination responses.
// Cache entries expire automatically and are cleared after destination or
// destination-rating changes.
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

const cache = new Map();
let cacheGeneration = 0;

const trimCache = () => {
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
};

const getOrSet = async (key, loader, ttl = DEFAULT_TTL_MS) => {
  const now = Date.now();
  const existing = cache.get(key);

  if (existing && existing.expiresAt > now) {
    // A pending promise is shared by concurrent requests as well.
    return existing.value;
  }

  if (existing) {
    cache.delete(key);
  }

  const generationAtStart = cacheGeneration;
  const pending = Promise.resolve().then(loader);

  cache.set(key, {
    value: pending,
    expiresAt: Number.POSITIVE_INFINITY,
  });
  trimCache();

  try {
    const value = await pending;

    // Do not repopulate the cache if it was invalidated while loading.
    if (generationAtStart === cacheGeneration) {
      cache.set(key, {
        value: Promise.resolve(value),
        expiresAt: Date.now() + ttl,
      });
      trimCache();
    }

    return value;
  } catch (error) {
    // Only remove this request's entry; don't remove a newer replacement.
    if (cache.get(key)?.value === pending) {
      cache.delete(key);
    }
    throw error;
  }
};

const invalidateDestinationCache = () => {
  cacheGeneration += 1;
  cache.clear();
};

module.exports = {
  getOrSet,
  invalidateDestinationCache,
};
