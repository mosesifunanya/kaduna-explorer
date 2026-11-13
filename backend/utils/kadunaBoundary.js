const fs = require("node:fs");
const path = require("node:path");

// ============================================
// 1. LOAD THE KADUNA STATE BOUNDARY FILE
// ============================================

const boundaryFile = path.join(__dirname, "..", "data", "kaduna-state.geojson");

if (!fs.existsSync(boundaryFile)) {
  throw new Error(`Kaduna boundary file not found: ${boundaryFile}`);
}

const boundaryFileContent = fs
  .readFileSync(boundaryFile, "utf8")
  .replace(/^\uFEFF/, "");

let boundaryData;

try {
  boundaryData = JSON.parse(boundaryFileContent);
} catch (error) {
  throw new Error(`Failed to parse Kaduna boundary GeoJSON: ${error.message}`);
}

// ============================================
// 2. VALIDATE THE GEOJSON DATA
// ============================================

if (
  boundaryData.type !== "FeatureCollection" ||
  !Array.isArray(boundaryData.features) ||
  boundaryData.features.length === 0
) {
  throw new Error(
    "The Kaduna boundary GeoJSON is invalid or contains no features.",
  );
}

const kadunaFeature = boundaryData.features.find(
  (feature) =>
    feature.properties?.shapeName === "Kaduna" ||
    feature.properties?.shapeISO === "NG-KD",
);

if (
  !kadunaFeature ||
  !["Polygon", "MultiPolygon"].includes(kadunaFeature.geometry?.type)
) {
  throw new Error(
    "A valid Kaduna State Polygon or MultiPolygon was not found.",
  );
}

const geometryCoordinates = kadunaFeature.geometry.coordinates;

if (!Array.isArray(geometryCoordinates) || geometryCoordinates.length === 0) {
  throw new Error("The Kaduna State boundary contains no coordinates.");
}

// ============================================
// 3. VALIDATE GEOJSON RINGS
// ============================================

function isValidPosition(position) {
  return (
    Array.isArray(position) &&
    position.length >= 2 &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1]) &&
    position[0] >= -180 &&
    position[0] <= 180 &&
    position[1] >= -90 &&
    position[1] <= 90
  );
}

function isValidRing(ring) {
  if (!Array.isArray(ring) || ring.length < 4) {
    return false;
  }

  if (!ring.every(isValidPosition)) {
    return false;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];

  return first[0] === last[0] && first[1] === last[1];
}

function isValidPolygonCoordinates(polygonCoordinates) {
  return (
    Array.isArray(polygonCoordinates) &&
    polygonCoordinates.length > 0 &&
    polygonCoordinates.every(isValidRing)
  );
}

if (kadunaFeature.geometry.type === "Polygon") {
  if (!isValidPolygonCoordinates(geometryCoordinates)) {
    throw new Error(
      "The Kaduna State Polygon contains invalid GeoJSON coordinates.",
    );
  }
} else {
  if (!geometryCoordinates.every(isValidPolygonCoordinates)) {
    throw new Error(
      "The Kaduna State MultiPolygon contains invalid GeoJSON coordinates.",
    );
  }
}

// ============================================
// 4. CHECK WHETHER A POINT IS ON A LINE SEGMENT
// ============================================

// GeoJSON coordinates use [longitude, latitude].
function isPointOnSegment(longitude, latitude, start, end) {
  const [x1, y1] = start;
  const [x2, y2] = end;

  const cross = (longitude - x1) * (y2 - y1) - (latitude - y1) * (x2 - x1);

  const tolerance = 1e-10;

  if (Math.abs(cross) > tolerance) {
    return false;
  }

  return (
    longitude >= Math.min(x1, x2) - tolerance &&
    longitude <= Math.max(x1, x2) + tolerance &&
    latitude >= Math.min(y1, y2) - tolerance &&
    latitude <= Math.max(y1, y2) + tolerance
  );
}

// ============================================
// 5. CHECK WHETHER A POINT IS INSIDE A RING
// ============================================

function isInsideRing(longitude, latitude, ring) {
  if (!isValidRing(ring)) {
    return false;
  }

  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const start = ring[j];
    const end = ring[i];

    // Treat points on the outer boundary as inside.
    if (isPointOnSegment(longitude, latitude, start, end)) {
      return true;
    }

    const [x1, y1] = start;
    const [x2, y2] = end;

    const crossesLatitude = y1 > latitude !== y2 > latitude;

    if (crossesLatitude) {
      const intersectionLongitude =
        ((x2 - x1) * (latitude - y1)) / (y2 - y1) + x1;

      if (longitude < intersectionLongitude) {
        inside = !inside;
      }
    }
  }

  return inside;
}

// ============================================
// 6. CHECK A POLYGON, INCLUDING ITS HOLES
// ============================================

function isInsidePolygon(longitude, latitude, polygonCoordinates) {
  if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) {
    return false;
  }

  const [outerRing, ...holes] = polygonCoordinates;

  if (!isInsideRing(longitude, latitude, outerRing)) {
    return false;
  }

  // A point inside a hole is outside the polygon.
  // Points on a hole boundary are also treated as outside.
  for (const hole of holes) {
    if (isInsideRing(longitude, latitude, hole)) {
      return false;
    }
  }

  return true;
}

// ============================================
// 7. CHECK WHETHER A LOCATION IS INSIDE KADUNA
// ============================================

/**
 * Checks whether a geographic location falls within
 * the Kaduna State boundary defined by the GeoJSON file.
 *
 * @param {number} latitude - Geographic latitude.
 * @param {number} longitude - Geographic longitude.
 * @returns {boolean} True if inside Kaduna State.
 */
function isInsideKaduna(latitude, longitude) {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return false;
  }

  if (kadunaFeature.geometry.type === "Polygon") {
    return isInsidePolygon(longitude, latitude, geometryCoordinates);
  }

  // MultiPolygon may contain multiple separate areas.
  return geometryCoordinates.some((polygonCoordinates) =>
    isInsidePolygon(longitude, latitude, polygonCoordinates),
  );
}

// ============================================
// 8. EXPORT THE BOUNDARY CHECKER
// ============================================

module.exports = {
  isInsideKaduna,
};
