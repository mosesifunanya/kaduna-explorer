import { apiRequest } from "@/lib/api";

export function getPlaceName(place) {
  return (
    place?.name ||
    place?.displayName?.text ||
    place?.displayName ||
    place?.properties?.name ||
    "Unnamed place"
  );
}

export function getPlaceAddress(place) {
  return (
    place?.address ||
    place?.formattedAddress ||
    place?.vicinity ||
    place?.properties?.formatted ||
    place?.properties?.address_line1 ||
    ""
  );
}

export function hasPlaceImage(place) {
  const candidates = [
    place?.image,
    place?.imageUrl,
    place?.photoUrl,
    place?.photo,
    place?.properties?.image,
    place?.properties?.image_url,
  ];

  return candidates.some((candidate) => {
    const value = typeof candidate === "string" ? candidate : candidate?.url;

    if (typeof value !== "string" || !value.trim()) return false;

    try {
      const url = new URL(value);

      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  });
}

/**
 * Prepare an external place for DuckDuckGo image discovery.
 * Clear image fields supplied by external providers so the displayed
 * image comes from the selected image lookup process.
 */
export function preparePlaceForImageLookup(place) {
  const name = String(getPlaceName(place) || "").trim();
  const eligible = Boolean(name && name !== "Unnamed place");

  return {
    ...place,
    image: null,
    imageUrl: null,
    photoUrl: null,
    photo: null,
    properties: place?.properties
      ? {
          ...place.properties,
          image: null,
          image_url: null,
        }
      : place?.properties,
    imageStatus: eligible ? "loading" : "unavailable",
    imageSource: null,
  };
}

/**
 * Enrich external places with DuckDuckGo Images.
 * A maximum of 2 image requests run concurrently.
 */
export async function enrichPlacesWithDuckDuckGoImages(
  places,
  signal,
  onImage,
  onUnavailable,
) {
  if (!Array.isArray(places) || !places.length || signal?.aborted) {
    return;
  }

  let nextIndex = 0;

  const workerCount = Math.min(2, places.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < places.length && !signal?.aborted) {
        const place = places[nextIndex++];

        const name = String(getPlaceName(place) || "").trim();

        if (!name || name === "Unnamed place") {
          onUnavailable?.(place);
          continue;
        }

        const locality = getPlaceAddress(place) || "Kaduna, Nigeria";
        const query = `${name}, ${locality}`.slice(0, 220);

        try {
          const response = await apiRequest(
            `destinations/search/image?q=${encodeURIComponent(query)}`,
            { signal },
          );

          const image =
            response?.data?.image ||
            response?.data?.data?.image ||
            response?.image ||
            null;

          if (signal?.aborted) continue;

          if (image && /^https?:\/\//i.test(image)) {
            onImage?.(place, image);
          } else {
            onUnavailable?.(place);
          }
        } catch (error) {
          if (!signal?.aborted && error?.name !== "AbortError") {
            onUnavailable?.(place);

            console.info("Place image unavailable:", name, error?.message);
          }
        }
      }
    }),
  );
}
