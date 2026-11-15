"use client";

import Image from "next/image";

const CLOUDINARY_HOST = "res.cloudinary.com";

const RESPONSIVE_WIDTHS = [
  320, 480, 640, 750, 828, 960, 1080, 1200, 1440, 1920, 2560,
];

function getCloudinaryUrl(src, width, quality) {
  if (typeof src !== "string" || !src.trim()) return null;

  try {
    const url = new URL(src.trim());

    if (
      url.protocol !== "https:" ||
      url.hostname !== CLOUDINARY_HOST ||
      !url.pathname.includes("/image/upload/")
    ) {
      return null;
    }

    const uploadMarker = "/image/upload/";
    const uploadIndex = url.pathname.indexOf(uploadMarker);
    const insertionIndex = uploadIndex + uploadMarker.length;
    const qualityMode = quality >= 85 ? "best" : quality >= 70 ? "good" : "eco";

    // Cloudinary negotiates AVIF/WebP and selects quality automatically.
    // c_limit prevents enlargement beyond the original image dimensions.
    const transformations = `f_auto,q_auto:${qualityMode},c_limit,w_${width}`;

    url.pathname =
      url.pathname.slice(0, insertionIndex) +
      transformations +
      "/" +
      url.pathname.slice(insertionIndex);

    return url.toString();
  } catch {
    return null;
  }
}

function isCloudinaryImage(src) {
  if (typeof src !== "string" || !src.trim()) return false;

  try {
    const url = new URL(src.trim());
    return (
      url.protocol === "https:" &&
      url.hostname === CLOUDINARY_HOST &&
      url.pathname.includes("/image/upload/")
    );
  } catch {
    return false;
  }
}

export default function OptimizedImage({
  src,
  alt = "",
  fill = false,
  width,
  height,
  sizes,
  priority = false,
  loading,
  quality = 75,
  className,
  style,
  onError,
  onLoad,
  ...props
}) {
  if (!src) return null;

  const shouldLoadEagerly = priority || loading === "eager";
  const resolvedLoading = shouldLoadEagerly ? "eager" : loading || "lazy";

  if (isCloudinaryImage(src)) {
    const requestedWidth =
      Number.isFinite(Number(width)) && Number(width) > 0
        ? Math.min(Math.round(Number(width)), 2560)
        : 1200;

    const srcSet = RESPONSIVE_WIDTHS.map((candidateWidth) => {
      const candidateUrl = getCloudinaryUrl(src, candidateWidth, quality);
      return candidateUrl ? `${candidateUrl} ${candidateWidth}w` : null;
    })
      .filter(Boolean)
      .join(", ");

    const optimizedSrc = getCloudinaryUrl(src, requestedWidth, quality) || src;

    return (
      <img
        src={optimizedSrc}
        srcSet={srcSet || undefined}
        sizes={sizes || (fill ? "100vw" : width ? `${width}px` : undefined)}
        alt={alt}
        width={!fill && width ? width : undefined}
        height={!fill && height ? height : undefined}
        loading={resolvedLoading}
        fetchPriority={priority ? "high" : props.fetchPriority}
        decoding="async"
        className={className}
        style={
          fill
            ? {
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                ...style,
              }
            : style
        }
        onError={onError}
        onLoad={onLoad}
        {...props}
      />
    );
  }

  // Preserve Next.js optimization for local public assets.
  if (typeof src === "string" && src.trim().startsWith("/")) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        {...(!fill && width && height ? { width, height } : {})}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : resolvedLoading}
        quality={quality}
        className={className}
        style={style}
        onError={onError}
        onLoad={onLoad}
        {...props}
      />
    );
  }

  // Keep third-party image URLs working without requiring every external
  // image host to be added to next.config.mjs.
  return (
    <img
      src={src}
      alt={alt}
      loading={resolvedLoading}
      decoding="async"
      className={className}
      style={
        fill
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              ...style,
            }
          : style
      }
      onError={onError}
      onLoad={onLoad}
      {...props}
    />
  );
}
