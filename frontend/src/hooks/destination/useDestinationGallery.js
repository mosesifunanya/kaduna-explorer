"use client";

import { useCallback, useEffect, useState } from "react";

export default function useDestinationGallery({
  destination,
  gallery,
  setError,
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActiveImage(0);
    setViewerOpen(false);
    setCopied(false);
  }, [destination?.slug]);

  useEffect(() => {
    if (!viewerOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setViewerOpen(false);
      }

      if (event.key === "ArrowRight" && gallery.length > 1) {
        setActiveImage((current) => (current + 1) % gallery.length);
      }

      if (event.key === "ArrowLeft" && gallery.length > 1) {
        setActiveImage(
          (current) => (current - 1 + gallery.length) % gallery.length,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewerOpen, gallery.length]);

  const shareDestination = useCallback(async () => {
    if (!destination || typeof window === "undefined") return;

    const shareData = {
      title: destination.name || "Kaduna Explorer",
      text: `Discover ${destination.name || "this place"} with Kaduna Explorer.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      } else {
        setError(
          "Sharing is not supported by this browser. Copy the page address from your browser instead.",
        );
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Unable to share destination:", err);
      }
    }
  }, [destination, setError]);

  return {
    activeImage,
    setActiveImage,
    viewerOpen,
    setViewerOpen,
    copied,
    shareDestination,
  };
}
