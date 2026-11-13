import { invalidatePublicDestinationCache } from "@/lib/publicDestinationCache";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
).replace(/\/+$/, "");

export async function apiRequest(path, options = {}) {
  const normalizedPath = String(path).replace(/^\/+/, "");
  const endpoint = `${API_BASE_URL}/${normalizedPath}`;

  const originalBody = options.body;

  const isFormData =
    typeof FormData !== "undefined" && originalBody instanceof FormData;

  const isBlob = typeof Blob !== "undefined" && originalBody instanceof Blob;

  const isURLSearchParams =
    typeof URLSearchParams !== "undefined" &&
    originalBody instanceof URLSearchParams;

  const isString = typeof originalBody === "string";

  const headers = new Headers(options.headers || {});

  let body = originalBody;

  // Convert ordinary JavaScript objects into JSON.
  if (
    originalBody !== undefined &&
    originalBody !== null &&
    !isFormData &&
    !isBlob &&
    !isURLSearchParams &&
    !isString
  ) {
    body = JSON.stringify(originalBody);
  }

  // Only set JSON Content-Type when a request body exists.
  // FormData retains the browser-generated multipart boundary.
  if (
    body !== undefined &&
    body !== null &&
    !isFormData &&
    !isBlob &&
    !isURLSearchParams &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...options,
    body,
    credentials: "include",
    headers,
  });

  let data = {};

  // Handle empty responses.
  if (response.status !== 204) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => ({}));
    } else {
      const responseText = await response.text().catch(() => "");

      if (responseText) {
        data = { message: responseText };
      }
    }
  }

  // Handle unsuccessful API responses while preserving HTTP details
  // for callers that need to distinguish authentication from other errors.
  if (!response.ok) {
    const error = new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}`,
    );

    error.status = response.status;
    error.data = data;
    error.response = {
      status: response.status,
      data,
    };

    throw error;
  }

  const method = String(options.method || "GET").toUpperCase();
  const requestPath = normalizedPath.split("?")[0];
  const isDestinationMutation =
    ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    (requestPath === "destinations" ||
      requestPath.startsWith("destinations/") ||
      requestPath === "reviews" ||
      requestPath.startsWith("reviews/"));

  if (isDestinationMutation) {
    invalidatePublicDestinationCache();
  }

  return data;
}
