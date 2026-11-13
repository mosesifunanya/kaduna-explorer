const STORAGE_KEY = "kaduna-explorer:public-destinations:v1";
const CACHE_VERSION = 1;
const MAX_STORAGE_CHARACTERS = 1_750_000;

let memoryDestinations = null;
let inFlightRequest = null;
let cacheGeneration = 0;

export function getCachedPublicDestinations() {
  if (typeof window === "undefined") return null;

  if (Array.isArray(memoryDestinations)) {
    return memoryDestinations;
  }

  try {
    const storedValue = window.sessionStorage.getItem(STORAGE_KEY);

    if (!storedValue) return null;

    const parsedValue = JSON.parse(storedValue);

    if (
      parsedValue?.version !== CACHE_VERSION ||
      !Array.isArray(parsedValue?.destinations)
    ) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    memoryDestinations = parsedValue.destinations;

    return memoryDestinations;
  } catch {
    return null;
  }
}

export async function fetchPublicDestinations(loader) {
  if (inFlightRequest) return inFlightRequest;

  const generationAtStart = cacheGeneration;

  const request = Promise.resolve()
    .then(loader)
    .then((destinations) => {
      if (!Array.isArray(destinations)) {
        throw new Error("The destinations response was not recognised.");
      }

      if (generationAtStart === cacheGeneration) {
        memoryDestinations = destinations;

        try {
          const serializedValue = JSON.stringify({
            version: CACHE_VERSION,
            cachedAt: Date.now(),
            destinations,
          });

          if (serializedValue.length <= MAX_STORAGE_CHARACTERS) {
            window.sessionStorage.setItem(STORAGE_KEY, serializedValue);
          } else {
            window.sessionStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          // Storage is optional; the in-memory cache remains available.
        }
      }

      return destinations;
    })
    .finally(() => {
      if (inFlightRequest === request) {
        inFlightRequest = null;
      }
    });

  inFlightRequest = request;

  return request;
}

export function invalidatePublicDestinationCache() {
  cacheGeneration += 1;
  memoryDestinations = null;
  inFlightRequest = null;

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}
