"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Globe,
  LoaderCircle,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Pencil,
  Send,
  Star,
  Ticket,
  Trash2,
  UserRound,
  X,
  Shirt,
  Utensils,
  Music2,
  Store,
  Share2,
  Heart,
  Clock3,
  Users,
} from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import OptimizedImage from "@/components/OptimizedImage";

// ============================================
// CONSTANTS
// ============================================

const ENDED_RETENTION_HOURS = 24;
const REVIEW_LIMIT = 2000;
const COMMENT_LIMIT = 2000;

const EVENT_DESCRIPTION_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "H2",
  "H3",
  "UL",
  "OL",
  "LI",
  "A",
  "BLOCKQUOTE",
]);

const EVENT_DESCRIPTION_BLOCKED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "MATH",
]);

const TRAVEL_MODES = [
  { value: "driving", label: "Drive" },
  { value: "walking", label: "Walk" },
  { value: "bicycling", label: "Cycle" },
  { value: "transit", label: "Transit" },
];

// ============================================
// RESPONSE HELPERS
// ============================================

function extractEvent(response) {
  return (
    response?.data?.event ||
    response?.data?.data?.event ||
    response?.event ||
    response?.data ||
    null
  );
}

function extractReviews(response) {
  const candidates = [
    response?.data?.reviews,
    response?.data?.data?.reviews,
    response?.reviews,
    response?.data?.data,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) || [];
}

function extractComments(response) {
  const candidates = [
    response?.data?.comments,
    response?.data?.data?.comments,
    response?.comments,
    response?.data?.data,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) || [];
}

function sanitizeEventDescription(html) {
  if (typeof window === "undefined") return "";

  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(
    String(html || ""),
    "text/html",
  );

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createDocumentFragment();
    }

    const tagName = node.tagName;

    if (EVENT_DESCRIPTION_BLOCKED_TAGS.has(tagName)) {
      return document.createDocumentFragment();
    }

    const children = Array.from(node.childNodes).map(cleanNode);

    if (!EVENT_DESCRIPTION_TAGS.has(tagName)) {
      const fragment = document.createDocumentFragment();
      children.forEach((child) => fragment.appendChild(child));
      return fragment;
    }

    const element = document.createElement(tagName.toLowerCase());
    children.forEach((child) => element.appendChild(child));

    if (tagName === "A") {
      const href = node.getAttribute("href") || "";

      try {
        const url = new URL(href, window.location.origin);

        if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
          element.setAttribute("href", href);
          element.setAttribute("rel", "noopener noreferrer");

          if (url.protocol === "http:" || url.protocol === "https:") {
            element.setAttribute("target", "_blank");
          }
        }
      } catch {
        // Invalid links are displayed as ordinary text.
      }
    }

    return element;
  }

  const fragment = document.createDocumentFragment();

  Array.from(parsedDocument.body.childNodes)
    .map(cleanNode)
    .forEach((node) => fragment.appendChild(node));

  const container = document.createElement("div");
  container.appendChild(fragment);

  return container.innerHTML;
}

function getEventDescriptionText(html) {
  if (typeof window === "undefined") return "";

  const parsedDocument = new DOMParser().parseFromString(
    String(html || ""),
    "text/html",
  );

  return (parsedDocument.body.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getEventId(event) {
  return String(event?._id || event?.id || "");
}

function getEventTitle(event) {
  return event?.title || "Untitled event";
}

function getEventImage(event) {
  const cover = event?.coverImage;

  if (typeof cover === "string" && cover.trim()) {
    return cover.trim();
  }

  if (cover?.url) return cover.url;

  return "";
}

function getGallery(event) {
  const images = Array.isArray(event?.images) ? event.images : [];

  return images
    .map((image) => {
      if (typeof image === "string") return image;
      return image?.url || "";
    })
    .filter(Boolean);
}

function getCategoryLabel(event) {
  return (
    event?.categoryLabel ||
    String(event?.category || "Event")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function getEventLocation(event) {
  return [event?.venue, event?.address, event?.city, event?.lga, event?.state]
    .filter((value) => typeof value === "string" && value.trim())
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");
}

function getEventDate(value, options = {}) {
  if (!value) return "Date to be announced";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date to be announced";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
    ...options,
  }).format(date);
}

function getEventTime(value, timezone = "Africa/Lagos") {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone || "Africa/Lagos",
  }).format(date);
}

function getEventStatus(event, now = Date.now()) {
  const start = new Date(event?.startDate).getTime();
  const end = new Date(event?.endDate).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return "upcoming";
  }

  if (now > end + ENDED_RETENTION_HOURS * 60 * 60 * 1000) {
    return "expired";
  }

  if (now > end) return "ended";
  if (now >= start) return "ongoing";
  if (start - now <= 24 * 60 * 60 * 1000) return "starting-soon";

  return "upcoming";
}

function getMapUrls(event, travelMode = "driving") {
  const coordinates = event?.location?.coordinates;

  const hasCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]));

  const destination = hasCoordinates
    ? `${Number(coordinates[1])},${Number(coordinates[0])}`
    : [event?.venue, event?.address, event?.city, event?.state]
        .filter(Boolean)
        .join(", ");

  const encodedDestination = encodeURIComponent(destination);

  const validTravelModes = ["driving", "walking", "bicycling", "transit"];

  const selectedMode = validTravelModes.includes(travelMode)
    ? travelMode
    : "driving";

  return {
    search: `https://www.google.com/maps/search/?api=1&query=${encodedDestination}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=${selectedMode}`,
  };
}

function getCalendarUrl(event) {
  const start = new Date(event?.startDate);
  const end = new Date(event?.endDate);

  if (
    !event?.startDate ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return "";
  }

  const formatDate = (date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: getEventTitle(event),
    dates: `${formatDate(start)}/${formatDate(end)}`,
    details: event?.shortDescription || event?.description || "",
    location: getEventLocation(event),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ============================================
// REVIEW HELPERS
// ============================================

function getReviewAuthor(review) {
  const author = review?.user || review?.author || review?.reviewer || {};

  return (
    author?.name ||
    author?.fullName ||
    author?.username ||
    review?.name ||
    "Visitor"
  );
}

function getReviewUserId(review) {
  const user = review?.user || review?.author || review?.reviewer || null;

  // The API may return the owner as a populated object or as a raw ObjectId string.
  if (typeof user === "string") return user;

  return String(
    user?._id ||
      user?.id ||
      user?.userId ||
      review?.userId ||
      review?.reviewerId ||
      "",
  );
}

function getReviewDate(review) {
  const value = review?.createdAt || review?.date || review?.updatedAt;

  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getValidReviewRating(review) {
  const rating = Number(review?.rating);

  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

function getReviewStatistics(reviews = [], event = {}) {
  const validReviews = reviews.filter(
    (review) => getValidReviewRating(review) !== null,
  );

  const total = validReviews.length;

  const ratingTotal = validReviews.reduce(
    (sum, review) => sum + getValidReviewRating(review),
    0,
  );

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = validReviews.filter(
      (review) => getValidReviewRating(review) === star,
    ).length;

    return {
      star,
      count,
      percentage: total ? Math.round((count / total) * 100) : 0,
    };
  });

  const hasLoadedReviews = Array.isArray(reviews);

  const fallbackCount = Number(event?.ratingsCount || 0);
  const fallbackAverage = Number(event?.averageRating || 0);

  return {
    total: hasLoadedReviews ? total : fallbackCount,
    average: total
      ? ratingTotal / total
      : fallbackCount > 0 && Number.isFinite(fallbackAverage)
        ? fallbackAverage
        : 0,
    distribution,
  };
}

// ============================================
// COMMENT HELPERS
// ============================================

function getCommentAuthor(comment) {
  const author = comment?.user || comment?.author || {};

  return author?.name || author?.fullName || author?.username || "Visitor";
}

function getCommentDate(comment) {
  const value = comment?.createdAt || comment?.updatedAt;

  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getCommentUserId(comment) {
  const user = comment?.user || comment?.author || {};

  return String(user?._id || user?.id || comment?.userId || "");
}

function getCurrentUserId(user) {
  return String(
    user?._id || user?.id || user?.userId || user?.sub || user?.user?._id || "",
  );
}

// ============================================
// REUSABLE UI COMPONENTS
// ============================================

function SectionHeading({ title, description }) {
  return (
    <div className="mb-3 border-l-[3px] border-[#B58B00] pl-3">
      <h2 className="font-serif text-lg font-bold leading-tight tracking-tight text-[#111827] sm:text-xl">
        {title}
      </h2>

      {description && (
        <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#71818A] sm:text-xs">
          {description}
        </p>
      )}
    </div>
  );
}

function ReviewStars({
  value = 0,
  size = 16,
  interactive = false,
  onChange,
  hoverValue = 0,
  onHover,
}) {
  const displayValue = hoverValue || value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => onHover?.(0)}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const active = starValue <= Number(displayValue || 0);

        if (interactive) {
          return (
            <button
              key={starValue}
              type="button"
              onClick={() => onChange?.(starValue)}
              onMouseEnter={() => onHover?.(starValue)}
              onFocus={() => onHover?.(starValue)}
              onBlur={() => onHover?.(0)}
              aria-label={`Rate ${starValue} out of 5`}
              aria-pressed={value === starValue}
              className="rounded-sm transition duration-200 hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5A78]"
            >
              <Star
                size={size}
                fill={active ? "#E8AD32" : "none"}
                className={active ? "text-[#E8AD32]" : "text-[#C7CFD1]"}
              />
            </button>
          );
        }

        return (
          <Star
            key={starValue}
            size={size}
            fill={active ? "#E8AD32" : "none"}
            className={active ? "text-[#E8AD32]" : "text-[#D5DCDD]"}
          />
        );
      })}
    </div>
  );
}

function EventStatusBadge({ status }) {
  const config = {
    upcoming: {
      label: "Upcoming event",
      className: "border-[#E8CCA5]/40 bg-[#E8CCA5]/15 text-[#F0DDBD]",
    },
    "starting-soon": {
      label: "Starting soon",
      className: "border-[#E8CCA5]/50 bg-[#E8CCA5]/20 text-[#F0DDBD]",
    },
    ongoing: {
      label: "LIVE NOW",
      className: "border-white bg-white text-red-600",
    },
    ended: {
      label: "Recently ended",
      className: "border-white/30 bg-white/10 text-white/80",
    },
    expired: {
      label: "Event ended",
      className: "border-white/30 bg-white/10 text-white/70",
    },
  };

  const selected = config[status] || config.upcoming;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[7px] font-bold uppercase tracking-[0.06em] sm:px-3 sm:py-1.5 sm:text-[9px] sm:tracking-[0.12em] ${selected.className}`}
    >
      {status === "ongoing" && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
      )}
      {selected.label}
    </span>
  );
}

// ============================================
// REVIEW CARD
// ============================================

function ReviewCard({
  review,
  currentUserId,
  authenticated,
  onDelete,
  index = 0,
  reduceMotion = false,
}) {
  const author = getReviewAuthor(review);
  const date = getReviewDate(review);
  const rating = Number(review?.rating || 0);
  const content = review?.review || review?.comment || review?.text || "";
  const reviewId = String(review?._id || review?.id || "");

  const reviewOwnerId = getReviewUserId(review);

  const isOwner =
    authenticated &&
    Boolean(currentUserId) &&
    Boolean(reviewOwnerId) &&
    reviewOwnerId.toLowerCase() === String(currentUserId).toLowerCase();

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!reviewId || deleting) return;

    setDeleting(true);
    setError("");

    try {
      await onDelete(reviewId);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          "Your review could not be deleted. Please try again.",
      );
      setDeleting(false);
    }
  }

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
      className="rounded-xl border border-[#E2E8E9] bg-white p-3.5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(21,52,72,0.07)] sm:rounded-2xl sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF0F2] font-serif text-base text-[#063B59] sm:h-10 sm:w-10">
            {author.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#153448] sm:text-sm">
              {author}

              {isOwner && (
                <span className="ml-2 rounded-full bg-[#EAF5EC] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#176B48]">
                  You
                </span>
              )}
            </p>

            {date && (
              <p className="mt-1 text-[9px] text-[#84939A] sm:text-[10px]">
                {date}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <ReviewStars value={rating} size={12} />

          {isOwner && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete your review"
              title="Delete your review"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#A34A40] transition duration-200 hover:bg-[#FFF0ED] hover:text-[#8F3028] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          )}
        </div>
      </div>

      {content && (
        <p className="mt-3 whitespace-pre-line text-[11px] leading-6 text-[#536B78] sm:text-xs lg:text-sm">
          {content}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-[#FFF0ED] p-2.5 text-[10px] text-[#A43D32] sm:text-xs"
        >
          {error}
        </p>
      )}
    </motion.article>
  );
}

// ============================================
// EVENT GALLERY
// ============================================

function EventGallery({ event }) {
  const images = getGallery(event);
  const cover = getEventImage(event);
  const galleryImages = [...new Set([cover, ...images].filter(Boolean))];

  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    if (!activeImage) return;

    function handleKeyDown(eventObject) {
      if (eventObject.key === "Escape") {
        setActiveImage(null);
      }

      if (eventObject.key === "ArrowRight") {
        setActiveImage((current) => {
          const index = galleryImages.indexOf(current);
          return galleryImages[(index + 1) % galleryImages.length];
        });
      }

      if (eventObject.key === "ArrowLeft") {
        setActiveImage((current) => {
          const index = galleryImages.indexOf(current);
          return galleryImages[
            (index - 1 + galleryImages.length) % galleryImages.length
          ];
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeImage, galleryImages]);

  if (galleryImages.length === 0) {
    return (
      <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-[#D9E2E6] bg-white px-4 py-6 text-center">
        <CalendarDays size={25} className="text-[#B58B55]" />

        <p className="mt-3 font-serif text-sm text-[#153448]">
          Event photographs coming soon
        </p>

        <p className="mt-1 text-[11px] leading-5 text-[#71818A]">
          Photographs from this experience will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3 lg:grid-cols-3">
        {galleryImages.slice(0, 4).map((image, index) => (
          <motion.button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setActiveImage(image)}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="group relative aspect-[0.82] min-w-0 overflow-hidden rounded-lg bg-[#E2E8E9] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#07563D] focus-visible:ring-offset-2 sm:aspect-[1.25] sm:rounded-xl"
          >
            <OptimizedImage
              src={image}
              alt={`${getEventTitle(event)} photograph ${index + 1}`}
              fill
              sizes="(max-width: 639px) 25vw, (max-width: 1023px) 25vw, 33vw"
              loading="lazy"
              className="object-cover transition duration-700 group-hover:scale-105"
            />

            <div
              className={`absolute inset-0 transition duration-300 ${
                index === 3 && galleryImages.length > 4
                  ? "flex items-center justify-center bg-[#071F2D]/65"
                  : "bg-gradient-to-t from-[#071F2D]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100"
              }`}
            >
              {index === 3 && galleryImages.length > 4 && (
                <span className="text-center text-white">
                  <span className="block text-xl font-bold">
                    +{galleryImages.length - 4}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider">
                    More photos
                  </span>
                </span>
              )}
            </div>

            {!(index === 3 && galleryImages.length > 4) && (
              <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#063B59] opacity-0 shadow-lg transition duration-300 group-hover:opacity-100">
                <ExternalLink size={14} />
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Event photograph preview"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071F2D]/95 p-4 backdrop-blur-sm"
          onClick={() => setActiveImage(null)}
        >
          <button
            type="button"
            onClick={() => setActiveImage(null)}
            aria-label="Close image preview"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={21} />
          </button>

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photograph"
                onClick={(eventObject) => {
                  eventObject.stopPropagation();
                  const index = galleryImages.indexOf(activeImage);
                  setActiveImage(
                    galleryImages[
                      (index - 1 + galleryImages.length) % galleryImages.length
                    ],
                  );
                }}
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft size={22} />
              </button>

              <button
                type="button"
                aria-label="Next photograph"
                onClick={(eventObject) => {
                  eventObject.stopPropagation();
                  const index = galleryImages.indexOf(activeImage);
                  setActiveImage(
                    galleryImages[(index + 1) % galleryImages.length],
                  );
                }}
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          <div
            className="relative h-[85vh] w-full max-w-6xl"
            onClick={(eventObject) => eventObject.stopPropagation()}
          >
            <OptimizedImage
              src={activeImage}
              alt={getEventTitle(event)}
              fill
              sizes="(max-width: 639px) 100vw, 1152px"
              loading="eager"
              fetchPriority="high"
              className="rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// EVENT MAP
// ============================================

function EventMap({ event, className = "", id = "event-location" }) {
  const location = getEventLocation(event);
  const [travelMode, setTravelMode] = useState("driving");
  const mapUrls = getMapUrls(event, travelMode);
  const coordinates = event?.location?.coordinates;

  const hasCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]));

  const mapQuery = hasCoordinates
    ? `${Number(coordinates[1])},${Number(coordinates[0])}`
    : location;

  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`;

  const travelModeIcons = {
    driving: Navigation,
    walking: UserRound,
    bicycling: Compass,
    transit: Globe,
  };

  return (
    <section
      id={id}
      className={`scroll-mt-24 overflow-hidden rounded-xl border border-[#E5E9E7] bg-white shadow-[0_8px_24px_rgba(21,52,72,0.05)] transition duration-300 hover:shadow-[0_14px_32px_rgba(21,52,72,0.09)] sm:rounded-2xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-3.5 pb-3 pt-3.5 sm:px-4 sm:pt-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#B58B55]">
            Find your way
          </p>

          <h3 className="mt-1 font-serif text-base text-[#153448] sm:text-lg">
            Event location
          </h3>
        </div>

        <MapPin size={18} className="text-[#0B6847]" />
      </div>

      {location ? (
        <>
          <div className="mx-3.5 overflow-hidden rounded-lg border border-[#E5E9E7] bg-[#EEF2EF] sm:mx-4 sm:rounded-xl">
            <div className="grid grid-cols-4 gap-1 border-b border-[#E5E9E7] bg-white p-1">
              {TRAVEL_MODES.map((mode) => {
                const selected = travelMode === mode.value;
                const Icon = travelModeIcons[mode.value];

                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setTravelMode(mode.value)}
                    aria-pressed={selected}
                    className={`inline-flex min-h-8 items-center justify-center gap-1 rounded-md px-1 text-[9px] font-bold transition duration-200 sm:min-h-9 sm:rounded-lg sm:text-[10px] ${
                      selected
                        ? "bg-[#07563D] text-white shadow-sm"
                        : "text-[#536B78] hover:bg-[#F1F5F2] hover:text-[#07563D]"
                    }`}
                  >
                    <Icon size={11} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>

            <iframe
              title={`Map showing ${event.venue || getEventTitle(event)}`}
              src={embedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[150px] w-full border-0 sm:h-[230px]"
              allowFullScreen
            />
          </div>

          <div className="p-3.5 sm:p-4">
            <div className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0 text-[#07563D]" />

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#153448] sm:text-xs lg:text-sm">
                  {event.venue || "Event venue"}
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#71818A] lg:text-sm">
                  {location}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={mapUrls.directions}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center justify-center gap-1 rounded-full bg-[#07563D] px-2.5 text-[9px] font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#06452F] sm:min-h-10 sm:gap-1.5 sm:text-[10px]"
              >
                <Navigation size={12} />
                Get directions
                <ExternalLink size={10} />
              </a>

              <a
                href={mapUrls.search}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center justify-center gap-1 rounded-full border border-[#D8E2DC] px-2.5 text-[9px] font-bold text-[#07563D] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F2F7F3] sm:min-h-10 sm:gap-1.5 sm:text-[10px]"
              >
                View on map
                <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="px-5 pb-6 text-center">
          <p className="text-xs text-[#71818A]">
            The organiser has not provided the event location yet.
          </p>
        </div>
      )}
    </section>
  );
}

// ============================================
// EVENT COUNTDOWN
// ============================================

function EventCountdown({ startDate, now }) {
  const target = new Date(startDate).getTime();
  const difference = Math.max(0, target - now);

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  const units = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ];

  if (!Number.isFinite(target)) return null;

  return (
    <div className="rounded-xl border border-[#F0E6D2] bg-[#FBF6E9] p-3 sm:rounded-2xl sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-base font-bold text-[#153448] sm:text-lg">
            The experience is approaching
          </h3>

          <p className="mt-1 text-[10px] leading-5 text-[#71818A] sm:text-[11px] lg:text-sm">
            Join us for an unforgettable experience.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {units.map((unit) => (
            <div
              key={unit.label}
              className="rounded-lg bg-[#07563D] px-1 py-2.5 text-center text-white shadow-sm sm:px-1.5 sm:py-3"
            >
              <p className="font-serif text-lg font-bold leading-none tabular-nums sm:text-2xl">
                {String(unit.value).padStart(2, "0")}
              </p>

              <p className="mt-1.5 text-[7px] font-semibold uppercase tracking-wide text-white/75 sm:text-[9px]">
                {unit.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EVENT COMMENTS
// ============================================

function EventCommentCard({
  comment,
  currentUserId,
  authenticated,
  onUpdate,
  onDelete,
  reduceMotion,
  index = 0,
}) {
  const author = getCommentAuthor(comment);
  const date = getCommentDate(comment);
  const commentId = String(comment?._id || comment?.id || "");
  const isOwner =
    authenticated &&
    currentUserId &&
    getCommentUserId(comment) === currentUserId;

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment?.comment || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdate(eventObject) {
    eventObject.preventDefault();
    setError("");

    const trimmed = editText.trim();

    if (!trimmed) {
      setError("Please write a comment before saving.");
      return;
    }

    if (trimmed.length > COMMENT_LIMIT) {
      setError(`Your comment cannot exceed ${COMMENT_LIMIT} characters.`);
      return;
    }

    setSaving(true);

    try {
      await onUpdate(commentId, trimmed);
      setEditing(false);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          "Your comment could not be updated. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!commentId || deleting) return;

    setDeleting(true);
    setError("");

    try {
      await onDelete(commentId);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          "Your comment could not be deleted. Please try again.",
      );
      setDeleting(false);
    }
  }

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.045, 0.25) }}
      className="rounded-xl border border-[#E2E8E9] bg-white p-3.5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(21,52,72,0.06)] sm:rounded-2xl sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF2EC] font-serif text-base font-bold text-[#07563D] sm:h-10 sm:w-10">
            {author.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#153448] sm:text-sm">
              {author}
              {isOwner && (
                <span className="ml-2 rounded-full bg-[#EAF5EC] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#176B48]">
                  You
                </span>
              )}
            </p>

            {date && (
              <p className="mt-1 text-[9px] text-[#84939A] sm:text-[10px]">
                {date}
              </p>
            )}
          </div>
        </div>

        {isOwner && !editing && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setEditText(comment?.comment || "");
                setEditing(true);
                setError("");
              }}
              aria-label="Edit your comment"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#536B78] transition hover:bg-[#EDF3EF] hover:text-[#07563D]"
            >
              <Pencil size={14} />
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete your comment"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#A34A40] transition hover:bg-[#FFF0ED] disabled:opacity-50"
            >
              {deleting ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleUpdate} className="mt-3">
          <textarea
            value={editText}
            onChange={(eventObject) => setEditText(eventObject.target.value)}
            maxLength={COMMENT_LIMIT}
            rows={3}
            autoFocus
            className="w-full resize-y rounded-lg border border-[#DDE5E7] bg-[#FCFCFA] px-3 py-2.5 text-[11px] leading-5 text-[#153448] outline-none transition focus:border-[#07563D] focus:ring-4 focus:ring-[#07563D]/10 sm:text-xs"
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[9px] text-[#84939A]">
              {editText.length} / {COMMENT_LIMIT}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditText(comment?.comment || "");
                  setError("");
                }}
                disabled={saving}
                className="rounded-full border border-[#D9E2E6] px-3.5 py-2 text-[10px] font-bold text-[#536B78] transition hover:bg-[#F5F7F6] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#07563D] px-3.5 py-2 text-[10px] font-bold text-white transition hover:bg-[#06452F] disabled:opacity-50"
              >
                {saving && <LoaderCircle size={12} className="animate-spin" />}
                Save changes
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-3 whitespace-pre-line break-words text-[11px] leading-6 text-[#536B78] sm:text-xs lg:text-sm">
          {comment?.comment}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-[#FFF0ED] p-2.5 text-[10px] text-[#A43D32] sm:text-xs"
        >
          {error}
        </p>
      )}
    </motion.article>
  );
}

function EventComments({
  event,
  comments,
  loading,
  authenticated,
  currentUserId,
  loginUrl,
  onCommentSubmitted,
  onCommentUpdated,
  onCommentDeleted,
  reduceMotion,
}) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submitComment(eventObject) {
    eventObject.preventDefault();
    setError("");
    setNotice("");

    if (!authenticated) {
      setError("Please sign in to join the conversation.");
      return;
    }

    const trimmedComment = commentText.trim();

    if (!trimmedComment) {
      setError("Please write a comment before submitting.");
      return;
    }

    if (trimmedComment.length > COMMENT_LIMIT) {
      setError(`Your comment cannot exceed ${COMMENT_LIMIT} characters.`);
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest("event-comments", {
        method: "POST",
        body: {
          event: getEventId(event),
          comment: trimmedComment,
        },
      });

      setCommentText("");
      setNotice("Your comment has been published successfully.");
      await onCommentSubmitted?.();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          "Your comment could not be published. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="event-comments" className="scroll-mt-24">
      <SectionHeading
        title="Join the conversation"
        description="Share your thoughts and see what other visitors are saying about this event."
      />

      <div className="rounded-xl border border-[#E2E8E9] bg-white p-3.5 shadow-[0_8px_30px_rgba(21,52,72,0.04)] sm:rounded-2xl sm:p-4">
        {authenticated ? (
          <form onSubmit={submitComment}>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF2EC] text-[#07563D]">
                <UserRound size={17} />
              </div>

              <div>
                <h3 className="font-serif text-base font-bold text-[#153448] sm:text-lg">
                  Leave a comment
                </h3>
                <p className="text-[9px] text-[#84939A] sm:text-[10px]">
                  Your comment will be visible to everyone.
                </p>
              </div>
            </div>

            <label className="mt-3 block">
              <span className="sr-only">Write your comment</span>
              <textarea
                value={commentText}
                onChange={(eventObject) =>
                  setCommentText(eventObject.target.value)
                }
                maxLength={COMMENT_LIMIT}
                rows={3}
                placeholder="What do you think about this event?"
                className="w-full resize-y rounded-lg border border-[#DDE5E7] bg-[#FCFCFA] px-3 py-2.5 text-[11px] leading-5 text-[#153448] outline-none transition placeholder:text-[#8B999F] focus:border-[#07563D] focus:ring-4 focus:ring-[#07563D]/10 sm:rounded-xl sm:px-3.5 sm:text-xs sm:leading-6 lg:text-sm"
              />
            </label>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[9px] text-[#84939A] sm:text-[10px]">
                {commentText.length} / {COMMENT_LIMIT}
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#07563D] px-4 py-2 text-[10px] font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#06452F] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:px-5 sm:text-[11px]"
              >
                {submitting ? (
                  <LoaderCircle size={13} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                Post comment
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF2EC] text-[#07563D]">
                <UserRound size={17} />
              </div>

              <div>
                <h3 className="font-serif text-base font-bold text-[#153448] sm:text-lg">
                  Be part of the conversation
                </h3>
                <p className="mt-1 text-[10px] leading-5 text-[#71818A] sm:text-xs">
                  Sign in to share your thoughts and interact with other
                  visitors.
                </p>
              </div>
            </div>

            <Link
              href={loginUrl}
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-[#07563D] px-5 py-2 text-[10px] font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#06452F] sm:min-h-10 sm:text-[11px]"
            >
              Sign in to comment
              <ArrowRight size={13} className="ml-1.5" />
            </Link>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-[#FFF0ED] p-2.5 text-[10px] text-[#A43D32] sm:text-xs"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="mt-3 rounded-lg bg-[#EAF5EC] p-2.5 text-[10px] text-[#176B48] sm:text-xs"
          >
            {notice}
          </p>
        )}
      </div>

      <div className="mt-5 sm:mt-6">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <h3 className="font-serif text-base text-[#153448] sm:text-lg">
            Visitor comments
          </h3>

          <span className="text-[9px] font-semibold text-[#84939A] sm:text-[10px]">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-[#E2E8E9] bg-white py-8">
            <LoaderCircle size={20} className="animate-spin text-[#07563D]" />
          </div>
        ) : comments.length > 0 ? (
          <div className="grid gap-2.5 sm:gap-3">
            {comments.map((comment, index) => (
              <EventCommentCard
                key={comment._id || comment.id || index}
                comment={comment}
                currentUserId={currentUserId}
                authenticated={authenticated}
                onUpdate={onCommentUpdated}
                onDelete={onCommentDeleted}
                reduceMotion={reduceMotion}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#D9E2E6] bg-white px-4 py-7 text-center">
            <Send size={21} className="mx-auto text-[#B58B55]" />

            <p className="mt-2 font-serif text-sm text-[#153448]">
              No comments yet
            </p>

            <p className="mt-1 text-[10px] leading-5 text-[#71818A]">
              Start the conversation by sharing your thoughts about this event.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================
// REVIEW SECTION
// ============================================

function EventReviews({
  event,
  reviews,
  loading,
  authenticated,
  currentUserId,
  onReviewSubmitted,
  onReviewDeleted,
  reduceMotion,
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const statistics = useMemo(
    () => getReviewStatistics(reviews, event),
    [reviews, event],
  );

  async function submitReview(eventObject) {
    eventObject.preventDefault();
    setError("");
    setNotice("");

    if (!authenticated) {
      setError("Please sign in to submit a review.");
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("Please select a star rating before submitting.");
      return;
    }

    const trimmedReview = reviewText.trim();

    if (!trimmedReview) {
      setError("Please write your review before submitting.");
      return;
    }

    if (trimmedReview.length > REVIEW_LIMIT) {
      setError(`Your review cannot exceed ${REVIEW_LIMIT} characters.`);
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest("event-reviews", {
        method: "POST",
        body: {
          event: getEventId(event),
          rating,
          review: trimmedReview,
        },
      });

      setReviewText("");
      setRating(0);
      setHoverRating(0);

      setNotice(
        "Your review has been published successfully. Thank you for sharing your experience.",
      );

      await onReviewSubmitted?.();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          "Your review could not be submitted. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="event-reviews" className="scroll-mt-24">
      <SectionHeading
        title="Reviews & ratings"
        description="See what visitors think and share your own experience."
      />

      <div className="grid gap-3 rounded-xl border border-[#E2E8E9] bg-white p-3 shadow-[0_8px_30px_rgba(21,52,72,0.04)] sm:gap-4 sm:rounded-2xl sm:p-4 lg:grid-cols-[175px_minmax(0,1fr)]">
        <div className="flex flex-col justify-center rounded-xl bg-[#FBF5E8] px-3 py-3.5 text-center sm:px-4 sm:py-4">
          <p className="font-serif text-3xl font-bold leading-none text-[#153448] tabular-nums sm:text-4xl">
            {statistics.average > 0 ? statistics.average.toFixed(1) : "—"}
            <span className="ml-1 text-sm font-semibold sm:text-base">/ 5</span>
          </p>

          <div className="mt-2 flex justify-center">
            <ReviewStars value={Math.round(statistics.average)} size={15} />
          </div>

          <p className="mt-1.5 text-[10px] font-semibold text-[#71818A] lg:text-xs">
            {statistics.total} {statistics.total === 1 ? "Review" : "Reviews"}
          </p>

          <div className="mt-3 space-y-1.5 border-t border-[#E8DFC9] pt-3">
            {statistics.distribution.map((item) => (
              <div
                key={item.star}
                className="flex items-center gap-1.5"
                aria-label={`${item.star} star: ${item.percentage}%`}
              >
                <span className="w-3 text-right text-[9px] font-semibold text-[#71818A]">
                  {item.star}
                </span>

                <Star
                  size={10}
                  fill="#E8AD32"
                  className="shrink-0 text-[#E8AD32]"
                />

                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E9E2D3]">
                  <div
                    className="h-full rounded-full bg-[#D69A19] transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <span className="w-8 text-right text-[9px] tabular-nums text-[#71818A]">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submitReview} className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-serif text-base font-bold text-[#153448] sm:text-lg">
              Write a review
            </h3>

            {!authenticated && (
              <span className="text-[9px] text-[#84939A] sm:text-[10px]">
                Sign in to submit
              </span>
            )}
          </div>

          <p className="mt-1 text-[10px] text-[#71818A] sm:text-xs">
            Your rating (required)
          </p>

          <div className="mt-1.5">
            <ReviewStars
              value={rating}
              hoverValue={hoverRating}
              size={21}
              interactive
              onChange={setRating}
              onHover={setHoverRating}
            />
          </div>

          <label className="mt-2.5 block">
            <span className="sr-only">Share your experience</span>

            <textarea
              value={reviewText}
              onChange={(eventObject) =>
                setReviewText(eventObject.target.value)
              }
              maxLength={REVIEW_LIMIT}
              rows={3}
              placeholder="Share your experience at this event..."
              className="w-full resize-y rounded-lg border border-[#DDE5E7] bg-[#FCFCFA] px-3 py-2.5 text-[11px] leading-5 text-[#153448] outline-none transition placeholder:text-[#8B999F] focus:border-[#0B5A78] focus:ring-4 focus:ring-[#0B5A78]/10 sm:rounded-xl sm:px-3.5 sm:text-xs sm:leading-6 lg:text-sm"
            />
          </label>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[9px] text-[#84939A] sm:text-[10px]">
              {reviewText.length} / {REVIEW_LIMIT}
            </p>

            <button
              type="submit"
              disabled={submitting || !authenticated}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#07563D] px-3.5 py-2 text-[10px] font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#06452F] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9 sm:px-4 sm:text-[11px]"
            >
              {submitting ? (
                <LoaderCircle size={13} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              Submit review
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-2 rounded-lg bg-[#FFF0ED] p-2.5 text-[10px] text-[#A43D32] sm:text-xs"
            >
              {error}
            </p>
          )}

          {notice && (
            <p
              role="status"
              className="mt-2 rounded-lg bg-[#EAF5EC] p-2.5 text-[10px] text-[#176B48] sm:text-xs"
            >
              {notice}
            </p>
          )}
        </form>
      </div>

      <div className="mt-5 sm:mt-6">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <h3 className="font-serif text-base text-[#153448] sm:text-lg">
            Visitor reviews
          </h3>

          <span className="text-[9px] font-semibold text-[#84939A] sm:text-[10px]">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-[#E2E8E9] bg-white py-8">
            <LoaderCircle size={20} className="animate-spin text-[#063B59]" />
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            {reviews.map((reviewItem, index) => (
              <ReviewCard
                key={reviewItem._id || reviewItem.id || index}
                review={reviewItem}
                currentUserId={currentUserId}
                authenticated={authenticated}
                onDelete={onReviewDeleted}
                index={index}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#D9E2E6] bg-white px-4 py-7 text-center">
            <Star size={22} className="mx-auto text-[#B58B55]" />

            <p className="mt-2 font-serif text-sm text-[#153448]">
              No reviews yet
            </p>

            <p className="mt-1 text-[10px] leading-5 text-[#71818A]">
              Be the first to share your experience.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================
// MAIN EVENT DETAIL PAGE
// ============================================

function EventDetailContent() {
  const params = useParams();
  const slug = params?.slug;

  const reduceMotion = useReducedMotion();
  const { user, authStatus } = useAuth();

  const authenticated = Boolean(user) || authStatus === "authenticated";
  const currentUserId = getCurrentUserId(user);

  const [event, setEvent] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);

  const descriptionSource = event?.description || event?.shortDescription || "";

  const descriptionHtml = useMemo(
    () => sanitizeEventDescription(descriptionSource),
    [descriptionSource],
  );

  const descriptionSummary = useMemo(
    () => getEventDescriptionText(descriptionSource),
    [descriptionSource],
  );

  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState("");
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToast("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const loginUrl = `/login?returnTo=${encodeURIComponent(
    `/events/${slug || ""}`,
  )}`;

  const loadEvent = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(`events/${encodeURIComponent(slug)}`, {
        method: "GET",
      });

      const eventData = extractEvent(response);

      if (!eventData || !(eventData._id || eventData.id)) {
        throw new Error("This event could not be found.");
      }

      if (eventData.isPublished === false) {
        throw new Error("This event is not currently available.");
      }

      setEvent(eventData);
    } catch (err) {
      setEvent(null);
      setError(
        err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          "We could not load this event. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadReviews = useCallback(async (eventId) => {
    if (!eventId) {
      setReviews([]);
      setReviewsLoading(false);
      return;
    }

    setReviewsLoading(true);

    try {
      const response = await apiRequest(
        `event-reviews?eventId=${encodeURIComponent(eventId)}`,
        { method: "GET" },
      );

      setReviews(extractReviews(response));
    } catch (err) {
      console.error("Event reviews loading error:", err);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const loadComments = useCallback(async (eventId) => {
    if (!eventId) {
      setComments([]);
      setCommentsLoading(false);
      return;
    }

    setCommentsLoading(true);

    try {
      const response = await apiRequest(
        `event-comments?eventId=${encodeURIComponent(eventId)}`,
        { method: "GET" },
      );

      setComments(extractComments(response));
    } catch (err) {
      console.error("Event comments loading error:", err);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const updateComment = useCallback(async (commentId, comment) => {
    await apiRequest(`event-comments/${encodeURIComponent(commentId)}`, {
      method: "PATCH",
      body: { comment },
    });

    setComments((currentComments) =>
      currentComments.map((item) =>
        String(item._id || item.id) === String(commentId)
          ? { ...item, comment, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
  }, []);

  const deleteComment = useCallback(async (commentId) => {
    await apiRequest(`event-comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    });

    setComments((currentComments) =>
      currentComments.filter(
        (item) => String(item._id || item.id) !== String(commentId),
      ),
    );

    setToast("Comment deleted successfully.");
  }, []);

  // ============================================
  // DELETE EVENT REVIEW
  // ============================================

  const deleteReview = useCallback(async (reviewId) => {
    await apiRequest(`event-reviews/${encodeURIComponent(reviewId)}`, {
      method: "DELETE",
    });

    setReviews((currentReviews) =>
      currentReviews.filter(
        (item) => String(item._id || item.id) !== String(reviewId),
      ),
    );

    setToast("Review deleted successfully.");
  }, []);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (!event) return;

    const eventId = getEventId(event);

    loadReviews(eventId);
    loadComments(eventId);
  }, [event, loadReviews, loadComments]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#FCFBF7] px-4 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-[1440px]">
            <div className="h-4 w-28 animate-pulse rounded bg-[#E2E8E9]" />

            <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm sm:mt-7 sm:rounded-2xl">
              <div className="h-[260px] animate-pulse bg-[#E3E9E9] sm:h-[380px]" />

              <div className="space-y-3 p-4 sm:space-y-4 sm:p-8">
                <div className="h-4 w-32 animate-pulse rounded bg-[#E3E9E9]" />
                <div className="h-8 w-3/4 animate-pulse rounded bg-[#E3E9E9]" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-[#E3E9E9]" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-xl bg-white"
                />
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (!event) {
    return (
      <>
        <Header />

        <main className="flex min-h-[70vh] items-center justify-center bg-[#FCFBF7] px-4 py-12 sm:px-5 sm:py-16">
          <div className="w-full max-w-xl rounded-xl border border-[#E2E8E9] bg-white px-5 py-8 text-center shadow-[0_12px_45px_rgba(21,52,72,0.06)] sm:rounded-2xl sm:px-10 sm:py-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#EAF0F2] text-[#063B59] sm:h-16 sm:w-16 sm:rounded-2xl">
              <CalendarClock size={27} />
            </div>

            <h1 className="mt-4 font-serif text-2xl text-[#153448] sm:mt-5 sm:text-3xl">
              Event unavailable
            </h1>

            <p className="mt-3 text-xs leading-6 text-[#71818A] sm:text-sm sm:leading-7">
              {error ||
                "This event may have been removed or is no longer available."}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5 sm:mt-6 sm:gap-3">
              <button
                type="button"
                onClick={loadEvent}
                className="rounded-full bg-[#07563D] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#06452F] sm:px-6 sm:py-3 sm:text-sm"
              >
                Try again
              </button>

              <Link
                href="/events"
                className="rounded-full border border-[#D9E2E6] bg-white px-5 py-2.5 text-xs font-bold text-[#063B59] sm:px-6 sm:py-3 sm:text-sm"
              >
                Back to events
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  // ============================================
  // EVENT INFORMATION
  // ============================================

  const eventId = getEventId(event);
  const cover = getEventImage(event);
  const location = getEventLocation(event);
  const organiser = event.organiser || "Event organiser";

  const startDate = getEventDate(event.startDate);
  const endDate = getEventDate(event.endDate);

  const startTime = getEventTime(event.startDate, event.timezone);
  const endTime = getEventTime(event.endDate, event.timezone);

  const status = getEventStatus(event, now);
  const hasEnded = status === "ended" || status === "expired";
  const isExpired = status === "expired";

  const showCountdown = status === "upcoming" || status === "starting-soon";

  const highlights = Array.isArray(event.highlights) ? event.highlights : [];

  const canRegister = Boolean(event.ticketUrl || event.registrationUrl);
  const calendarUrl = getCalendarUrl(event);

  // ============================================
  // MAIN PAGE
  // ============================================

  return (
    <>
      <Header />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed right-4 top-20 z-[120] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-[#CFE6D5] bg-white px-4 py-3 text-sm text-[#176B48] shadow-[0_12px_35px_rgba(21,52,72,0.16)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF5EC]">
            <CheckCircle2 size={18} />
          </span>
          <span className="font-semibold">{toast}</span>
        </div>
      )}

      <main className="min-h-screen overflow-hidden bg-[#FCFBF7] pb-0 text-[#153448] lg:pb-0">
        {/* BREADCRUMB */}

        <div className="mx-auto max-w-[1560px] px-4 pt-4 sm:px-10 sm:pt-6 lg:px-14 xl:px-16">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-[11px] font-bold text-[#536B78] transition hover:text-[#063B59] sm:text-xs"
            >
              <ArrowLeft size={14} />
              All events
            </Link>

            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-[11px] font-bold text-[#536B78] transition hover:text-[#07563D] sm:text-xs"
            >
              <Compass size={14} />
              Explore Kaduna
            </Link>
          </div>
        </div>

        {/* SPLIT EVENT HERO */}

        <section className="mx-auto max-w-[1350px] px-3.5 pb-1 pt-4 sm:px-8 sm:pb-2 sm:pt-5 lg:px-10 lg:pb-1 xl:px-12">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="grid aspect-auto h-auto grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] overflow-hidden rounded-2xl bg-[#153F60] shadow-[0_16px_38px_rgba(6,59,89,0.14)] sm:h-auto sm:min-h-0 sm:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] md:aspect-auto md:min-h-[360px] md:grid-cols-[1.12fr_1fr] lg:min-h-[390px] lg:rounded-[26px]"
          >
            <div className="relative flex h-full min-h-0 flex-col justify-start overflow-hidden px-2.5 pt-2.5 pb-3 text-white sm:px-9 sm:py-10 md:min-h-[360px] md:justify-center lg:min-h-[390px] lg:px-10">
              <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute -bottom-36 right-0 h-72 w-72 rounded-full border border-[#E8B83F]/20" />

              <div className="relative z-10">
                <div className="mb-2 flex flex-col items-start gap-1 overflow-hidden sm:mb-5 sm:flex-row sm:items-center sm:gap-2">
                  <span className="shrink-0 rounded-full border border-[#F2BD42]/50 bg-white/5 px-1.5 py-1 text-[7px] font-bold uppercase tracking-[0.04em] text-[#F2BD42] sm:px-3.5 sm:py-2 sm:text-[10px] sm:tracking-[0.14em]">
                    Featured experience
                  </span>

                  <EventStatusBadge status={status} />
                </div>

                <p className="line-clamp-2 text-[8px] font-extrabold uppercase leading-[1.35] tracking-[0.04em] text-[#F2BD42] sm:whitespace-normal sm:text-[10px] sm:leading-4 sm:tracking-[0.2em]">
                  {getCategoryLabel(event)}
                </p>

                <h1 className="mt-1 max-w-2xl break-words font-serif text-[17px] min-[380px]:text-[18px] leading-[1.06] tracking-[-0.035em] text-white sm:mt-3 sm:text-[36px] md:text-[40px] lg:text-[46px]">
                  {getEventTitle(event)}
                </h1>

                <p className="mt-1 block max-w-xl text-[9px] leading-[1.4] text-white/75 sm:mt-3 sm:text-xs sm:leading-6 lg:text-sm">
                  {event.shortDescription ||
                    (descriptionSummary
                      ? `${descriptionSummary.slice(0, 150)}${descriptionSummary.length > 150 ? "…" : ""}`
                      : "Discover this special experience in Kaduna State.")}
                </p>

                <div className="mt-2 space-y-1.5 text-[8px] font-semibold leading-[1.3] text-white/90 sm:mt-5 sm:space-y-2 sm:text-[11px] sm:leading-[1.45] lg:text-xs">
                  <span className="flex items-start gap-2">
                    <CalendarDays
                      size={11}
                      className="mt-0.5 shrink-0 text-[#F2BD42]"
                    />
                    {startDate}
                  </span>

                  {location && (
                    <span className="flex items-start gap-2">
                      <MapPin
                        size={11}
                        className="mt-0.5 shrink-0 text-[#F2BD42]"
                      />
                      <span className="min-w-0 break-words">{location}</span>
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex w-full flex-row items-center gap-1.5 sm:mt-6 sm:gap-3">
                  {canRegister && !isExpired && (
                    <a
                      href={event.ticketUrl || event.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-7 min-w-0 flex-1 items-center justify-center gap-0.5 whitespace-nowrap rounded-full bg-[#F2BD42] px-1 py-1 text-[7px] font-extrabold tracking-tight text-[#173327] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#FFD36B] sm:min-h-11 sm:gap-2 sm:px-5 sm:py-3 sm:text-xs"
                    >
                      <Ticket size={9} className="shrink-0 sm:h-3.5 sm:w-3.5" />
                      {event.ticketUrl ? "Get tickets" : "Register now"}
                      <ArrowRight
                        size={8}
                        className="shrink-0 sm:h-3.5 sm:w-3.5"
                      />
                    </a>
                  )}

                  {calendarUrl && (
                    <a
                      href={calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-7 min-w-0 flex-1 items-center justify-center gap-0.5 whitespace-nowrap rounded-full border border-white/60 px-1 py-1 text-[7px] font-bold tracking-tight text-white transition hover:bg-white/10 sm:min-h-11 sm:gap-2 sm:px-5 sm:py-3 sm:text-xs"
                    >
                      <CalendarClock
                        size={9}
                        className="shrink-0 sm:h-3.5 sm:w-3.5"
                      />
                      Add to calendar
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="relative min-h-full bg-[#0A3327]">
              {cover ? (
                <OptimizedImage
                  src={cover}
                  alt={getEventTitle(event)}
                  fill
                  sizes="(max-width: 767px) 50vw, (max-width: 1023px) 46vw, 540px"
                  loading="eager"
                  fetchPriority="high"
                  className="object-cover object-[center_top] sm:object-center"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0A3327] to-[#153F60]">
                  <CalendarDays size={54} className="text-white/30" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-r from-[#153F60]/25 via-transparent to-black/10 md:bg-gradient-to-l md:from-black/10 md:via-transparent md:to-[#153F60]/10" />
            </div>
          </motion.div>
        </section>

        {/* DESKTOP QUICK ACTIONS */}
        <div className="mx-auto hidden w-full max-w-[1400px] px-4 pt-2 lg:block lg:px-14 xl:px-16">
          <div className="grid grid-cols-5 gap-2">
            <a
              href={
                canRegister && !isExpired
                  ? event.ticketUrl || event.registrationUrl
                  : "#event-about"
              }
              target={canRegister && !isExpired ? "_blank" : undefined}
              rel={
                canRegister && !isExpired ? "noopener noreferrer" : undefined
              }
              className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#E7E8DF] bg-white px-2.5 py-2 text-[#07563D] shadow-[0_4px_14px_rgba(21,52,72,0.05)] transition duration-200 hover:-translate-y-1 hover:border-[#B9D8C5] hover:shadow-[0_10px_24px_rgba(21,52,72,0.08)]"
            >
              <Ticket size={18} />
              <span className="text-[11px] font-bold">Tickets</span>
            </a>

            <a
              href={calendarUrl || "#event-about"}
              target={calendarUrl ? "_blank" : undefined}
              rel={calendarUrl ? "noopener noreferrer" : undefined}
              className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#E7E8DF] bg-white px-2.5 py-2 text-[#07563D] shadow-[0_4px_14px_rgba(21,52,72,0.05)] transition duration-200 hover:-translate-y-1 hover:border-[#B9D8C5] hover:shadow-[0_10px_24px_rgba(21,52,72,0.08)]"
            >
              <CalendarClock size={18} />
              <span className="text-[11px] font-bold">Add to calendar</span>
            </a>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("event-location")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#E7E8DF] bg-white px-2.5 py-2 text-[#07563D] shadow-[0_4px_14px_rgba(21,52,72,0.05)] transition duration-200 hover:-translate-y-1 hover:border-[#B9D8C5] hover:shadow-[0_10px_24px_rgba(21,52,72,0.08)]"
            >
              <Navigation size={18} />
              <span className="text-[11px] font-bold">Directions</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const shareData = {
                  title: getEventTitle(event),
                  text: event.shortDescription || descriptionSummary,
                  url: window.location.href,
                };

                try {
                  if (navigator.share) {
                    await navigator.share(shareData);
                  } else if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(window.location.href);
                    setToast("Event link copied.");
                  }
                } catch (shareError) {
                  if (shareError?.name !== "AbortError") {
                    setToast("Unable to share this event right now.");
                  }
                }
              }}
              className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#E7E8DF] bg-white px-2.5 py-2 text-[#07563D] shadow-[0_4px_14px_rgba(21,52,72,0.05)] transition duration-200 hover:-translate-y-1 hover:border-[#B9D8C5] hover:shadow-[0_10px_24px_rgba(21,52,72,0.08)]"
            >
              <Share2 size={18} />
              <span className="text-[11px] font-bold">Share</span>
            </button>

            <button
              type="button"
              aria-pressed={isSaved}
              onClick={() => {
                setIsSaved((saved) => !saved);
                setToast(
                  isSaved
                    ? "Event removed from saved items."
                    : "Event saved on this page.",
                );
              }}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 shadow-[0_4px_14px_rgba(21,52,72,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(21,52,72,0.08)] ${
                isSaved
                  ? "border-[#B9D8C5] bg-[#EDF6EF] text-[#07563D]"
                  : "border-[#E7E8DF] bg-white text-[#07563D] hover:border-[#B9D8C5]"
              }`}
            >
              <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
              <span className="text-[11px] font-bold">
                {isSaved ? "Saved" : "Save"}
              </span>
            </button>
          </div>
        </div>

        {/* MOBILE EVENT PAGE: PURPOSE-BUILT PHONE LAYOUT */}
        <div className="mx-auto w-full max-w-[680px] space-y-5 px-3.5 pb-8 pt-0 lg:hidden">
          {/* QUICK ACTIONS */}
          <div className="grid grid-cols-5 gap-1.5">
            <a
              href={
                canRegister && !isExpired
                  ? event.ticketUrl || event.registrationUrl
                  : "#event-details"
              }
              target={canRegister && !isExpired ? "_blank" : undefined}
              rel={
                canRegister && !isExpired ? "noopener noreferrer" : undefined
              }
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl border border-[#E7E8DF] bg-white px-1 py-1.5 text-[#07563D] shadow-[0_4px_14px_rgba(21,52,72,0.05)] active:scale-[0.98]"
            >
              <Ticket size={17} />
              <span className="text-[8px] font-bold">Tickets</span>
            </a>
            <a
              href={calendarUrl || "#event-details"}
              target={calendarUrl ? "_blank" : undefined}
              rel={calendarUrl ? "noopener noreferrer" : undefined}
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl border border-[#E7E8DF] bg-white px-1 py-1.5 text-[#07563D] shadow-[0_4px_14px_rgba(21,52,72,0.05)] active:scale-[0.98]"
            >
              <CalendarClock size={17} />
              <span className="text-center text-[8px] font-bold leading-3">
                Add to
                <br />
                calendar
              </span>
            </a>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("event-location-mobile")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl border border-[#E7E8DF] bg-white px-1 py-1.5 text-[#07563D] shadow-[0_4px_14px_rgba(21,52,72,0.05)] active:scale-[0.98]"
            >
              <Navigation size={17} />
              <span className="text-[8px] font-bold">Directions</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const shareData = {
                  title: getEventTitle(event),
                  text: event.shortDescription || descriptionSummary,
                  url: window.location.href,
                };
                try {
                  if (navigator.share) {
                    await navigator.share(shareData);
                  } else if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(window.location.href);
                    setToast("Event link copied.");
                  }
                } catch (shareError) {
                  if (shareError?.name !== "AbortError") {
                    setToast("Unable to share this event right now.");
                  }
                }
              }}
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl border border-[#E7E8DF] bg-white px-1 py-1.5 text-[#07563D] shadow-[0_4px_14px_rgba(21,52,72,0.05)] active:scale-[0.98]"
            >
              <Share2 size={17} />
              <span className="text-[8px] font-bold">Share</span>
            </button>
            <button
              type="button"
              aria-pressed={isSaved}
              onClick={() => {
                setIsSaved((saved) => !saved);
                setToast(
                  isSaved
                    ? "Event removed from saved items."
                    : "Event saved on this page.",
                );
              }}
              className={`flex min-h-[66px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 shadow-[0_4px_14px_rgba(21,52,72,0.05)] transition active:scale-[0.98] ${isSaved ? "border-[#B9D8C5] bg-[#EDF6EF] text-[#07563D]" : "border-[#E7E8DF] bg-white text-[#07563D]"}`}
            >
              <Heart size={17} fill={isSaved ? "currentColor" : "none"} />
              <span className="text-[8px] font-bold">
                {isSaved ? "Saved" : "Save"}
              </span>
            </button>
          </div>

          {/* ABOUT */}
          <section id="event-about-mobile" className="scroll-mt-24">
            <SectionHeading title="About this event" />
            <div
              className={`px-1.5 text-[12px] leading-[1.8] text-[#53636A] [&_p]:mb-2 [&_p]:indent-3 ${aboutExpanded || descriptionSummary.length <= 500 ? "" : "line-clamp-4"}`}
            >
              <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            </div>
            {descriptionSummary.length > 500 && (
              <button
                type="button"
                onClick={() => setAboutExpanded((expanded) => !expanded)}
                className="mt-1 text-[11px] font-bold text-[#07563D]"
              >
                {aboutExpanded ? "Read less" : "Read more"}{" "}
                <ArrowRight size={12} className="ml-1 inline" />
              </button>
            )}
          </section>

          {/* EVENT PHOTOGRAPHS */}
          <section id="event-gallery-mobile" className="scroll-mt-24">
            <SectionHeading
              title="Event highlights"
              description="A glimpse of what to expect."
            />
            <EventGallery event={event} />
          </section>

          {/* EVENT DETAILS */}
          <section
            id="event-details"
            className="overflow-hidden rounded-2xl border border-[#E4E6DE] bg-white shadow-[0_5px_18px_rgba(21,52,72,0.05)]"
          >
            <div className="flex items-center gap-2 border-b border-[#E9EBE5] px-3.5 py-3">
              <CalendarDays size={19} className="text-[#07563D]" />
              <h2 className="text-base font-bold text-[#123A2C]">
                Event details
              </h2>
            </div>
            <div className="grid grid-cols-2">
              <div className="flex min-w-0 items-start gap-2 border-b border-r border-[#E9EBE5] p-3">
                <CalendarDays
                  size={17}
                  className="mt-0.5 shrink-0 text-[#07563D]"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#173327]">Date</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#53636A]">
                    {startDate}
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-2 border-b border-[#E9EBE5] p-3">
                <Clock3 size={17} className="mt-0.5 shrink-0 text-[#07563D]" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#173327]">Time</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#53636A]">
                    {startTime || "To be announced"}
                    {endTime ? ` – ${endTime}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-2 border-r border-[#E9EBE5] p-3">
                <MapPin size={17} className="mt-0.5 shrink-0 text-[#07563D]" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#173327]">Venue</p>
                  <p className="mt-0.5 break-words text-[11px] leading-4 text-[#53636A]">
                    {event.venue || location || "To be announced"}
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-2 p-3">
                <Users size={17} className="mt-0.5 shrink-0 text-[#07563D]" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#173327]">
                    Organiser
                  </p>
                  <p className="mt-0.5 break-words text-[11px] leading-4 text-[#53636A]">
                    {organiser}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* EVENT LOCATION AND REAL MAP */}
          <EventMap event={event} id="event-location-mobile" />

          {/* TICKET INFORMATION */}
          {event.ticketInformation && (
            <section className="rounded-xl border border-[#E4E6DE] bg-white p-3.5">
              <SectionHeading title="Ticket information" />
              <p className="whitespace-pre-line text-[11px] leading-5 text-[#536B78]">
                {event.ticketInformation}
              </p>
            </section>
          )}

          {/* ORGANISER CONTACT */}
          {(event.organiserDescription ||
            event.organiserEmail ||
            event.organiserPhone ||
            event.organiserWebsite) && (
            <section className="rounded-xl border border-[#E4E6DE] bg-white p-3.5">
              <SectionHeading title="Event organiser" />
              {event.organiserDescription && (
                <p className="text-[11px] leading-5 text-[#536B78]">
                  {event.organiserDescription}
                </p>
              )}
              <div className="mt-2 space-y-2">
                {event.organiserEmail && (
                  <a
                    href={`mailto:${event.organiserEmail}`}
                    className="flex items-center gap-2 break-all text-[11px] text-[#07563D]"
                  >
                    <Mail size={14} />
                    {event.organiserEmail}
                  </a>
                )}
                {event.organiserPhone && (
                  <a
                    href={`tel:${event.organiserPhone}`}
                    className="flex items-center gap-2 text-[11px] text-[#07563D]"
                  >
                    <Phone size={14} />
                    {event.organiserPhone}
                  </a>
                )}
                {event.organiserWebsite && (
                  <a
                    href={event.organiserWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 break-all text-[11px] text-[#07563D]"
                  >
                    <Globe size={14} />
                    Organiser website <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </section>
          )}

          {/* REVIEWS AND COMMENTS */}
          <EventReviews
            event={event}
            reviews={reviews}
            loading={reviewsLoading}
            authenticated={authenticated}
            currentUserId={currentUserId}
            onReviewSubmitted={() => loadReviews(eventId)}
            onReviewDeleted={deleteReview}
            reduceMotion={reduceMotion}
          />

          <EventComments
            event={event}
            comments={comments}
            loading={commentsLoading}
            authenticated={authenticated}
            currentUserId={currentUserId}
            loginUrl={loginUrl}
            onCommentSubmitted={() => loadComments(eventId)}
            onCommentUpdated={updateComment}
            onCommentDeleted={deleteComment}
            reduceMotion={reduceMotion}
          />
        </div>

        {/* MAIN CONTENT AND RIGHT SIDEBAR */}

        <div className="hidden lg:grid mx-auto w-full max-w-[1400px] grid-cols-1 items-start gap-6 px-4 py-5 sm:gap-7 sm:px-10 sm:py-7 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] lg:gap-7 lg:px-14 lg:py-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(350px,0.9fr)] xl:gap-8 xl:px-16">
          {/* LEFT COLUMN */}

          <div className="min-w-0 space-y-6 sm:space-y-8">
            {/* ABOUT */}

            <motion.section
              id="event-about"
              className="scroll-mt-24"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5 }}
            >
              <SectionHeading title="About this event" />

              <div
                className="
                  max-w-[76ch]
                  text-justify text-[11px] leading-[1.85] text-[#53636A]
                  [overflow-wrap:anywhere]
                  sm:text-xs sm:leading-[1.9] lg:text-sm lg:leading-[1.9]
                  [&_p]:mb-3
                  [&_p:last-child]:mb-0
                  [&_h2]:mb-2
                  [&_h2]:mt-6
                  [&_h2]:font-serif
                  [&_h2]:text-lg
                  [&_h2]:font-bold
                  [&_h2]:leading-tight
                  [&_h2]:text-[#153448]
                  [&_h3]:mb-2
                  [&_h3]:mt-5
                  [&_h3]:font-serif
                  [&_h3]:text-base
                  [&_h3]:font-bold
                  [&_h3]:text-[#153448]
                  [&_strong]:font-bold
                  [&_strong]:text-[#153448]
                  [&_b]:font-bold
                  [&_ul]:mb-3
                  [&_ul]:list-disc
                  [&_ul]:space-y-1.5
                  [&_ul]:pl-5
                  [&_ol]:mb-3
                  [&_ol]:list-decimal
                  [&_ol]:space-y-1.5
                  [&_ol]:pl-5
                  [&_li]:pl-1
                  [&_a]:font-semibold
                  [&_a]:text-[#0B5A78]
                  [&_a]:underline
                  [&_a]:underline-offset-2
                  [&_blockquote]:my-4
                  [&_blockquote]:border-l-2
                  [&_blockquote]:border-[#B58B00]
                  [&_blockquote]:pl-4
                  [&_blockquote]:italic
                "
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </motion.section>

            {/* EVENT DETAILS */}

            {event.details && (
              <section className="rounded-xl border border-[#E2E8E9] bg-white p-3.5 shadow-[0_6px_22px_rgba(21,52,72,0.035)] sm:rounded-2xl sm:p-4">
                <SectionHeading title="Event details" />

                <div className="whitespace-pre-line text-[11px] leading-6 text-[#536B78] sm:text-xs lg:text-sm">
                  {event.details}
                </div>
              </section>
            )}

            {/* EVENT HIGHLIGHTS */}

            {highlights.length > 0 && (
              <section className="scroll-mt-24">
                <SectionHeading
                  title="What to expect"
                  description="A few highlights from this experience."
                />

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                  {highlights.map((highlight, index) => {
                    const text =
                      typeof highlight === "string"
                        ? highlight
                        : highlight?.title || highlight?.name || "";

                    if (!text) return null;

                    const normalizedText = text.toLowerCase();

                    const HighlightIcon = /fashion|cloth|design|showcase/.test(
                      normalizedText,
                    )
                      ? Shirt
                      : /food|cuisine|chef|taste/.test(normalizedText)
                        ? Utensils
                        : /music|live|performance|concert/.test(normalizedText)
                          ? Music2
                          : /market|shop|craft|exhibition/.test(normalizedText)
                            ? Store
                            : CheckCircle2;

                    return (
                      <div
                        key={`${text}-${index}`}
                        className="flex min-h-[78px] flex-col items-center justify-center gap-1.5 rounded-lg border border-[#E2E5E0] bg-[#FFFEFA] p-2.5 text-center transition duration-300 hover:-translate-y-1 hover:border-[#D6C29D] hover:shadow-[0_12px_28px_rgba(21,52,72,0.08)] sm:min-h-[96px] sm:gap-2 sm:rounded-xl sm:p-4"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7F0E2] text-[#B58B00] sm:h-9 sm:w-9 sm:rounded-xl">
                          <HighlightIcon size={19} strokeWidth={2.2} />
                        </div>

                        <p className="text-[10px] font-semibold leading-4 text-[#153448] sm:text-xs sm:leading-5 lg:text-sm lg:leading-6">
                          {text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* MOBILE EVENT LOCATION */}

            <div className="lg:hidden">
              <EventMap event={event} />
            </div>

            {/* GALLERY */}

            <section id="event-gallery" className="scroll-mt-24">
              <SectionHeading title="Photographs" />
              <EventGallery event={event} />
            </section>

            {/* EVENT COMMENTS */}

            <EventComments
              event={event}
              comments={comments}
              loading={commentsLoading}
              authenticated={authenticated}
              currentUserId={currentUserId}
              loginUrl={loginUrl}
              onCommentSubmitted={() => loadComments(eventId)}
              onCommentUpdated={updateComment}
              onCommentDeleted={deleteComment}
              reduceMotion={reduceMotion}
            />

            {/* REVIEWS */}

            <EventReviews
              event={event}
              reviews={reviews}
              loading={reviewsLoading}
              authenticated={authenticated}
              currentUserId={currentUserId}
              onReviewSubmitted={() => loadReviews(eventId)}
              onReviewDeleted={deleteReview}
              reduceMotion={reduceMotion}
            />
          </div>

          {/* RIGHT SIDEBAR */}

          <aside className="order-first min-w-0 space-y-3.5 lg:sticky lg:top-24 lg:order-last lg:space-y-4 lg:self-start">
            {/* EVENT ORGANISER */}

            <div className="rounded-xl border border-[#E8E9E5] bg-white p-3.5 shadow-[0_6px_22px_rgba(21,52,72,0.035)] transition duration-300 hover:shadow-[0_12px_28px_rgba(21,52,72,0.07)] sm:rounded-2xl sm:p-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#B58B55] sm:text-[10px] sm:tracking-[0.2em]">
                Event organiser
              </p>

              <div className="mt-3 flex items-center gap-3 sm:mt-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF0F2] text-[#063B59] sm:h-11 sm:w-11 sm:rounded-xl">
                  <UserRound size={20} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#153448] sm:text-sm">
                    {organiser}
                  </p>

                  <p className="mt-1 text-[9px] text-[#84939A] sm:text-[10px]">
                    Event organiser
                  </p>
                </div>
              </div>

              {event.organiserDescription && (
                <p className="mt-3 text-[11px] leading-5 text-[#71818A] sm:text-xs sm:leading-6 lg:text-sm lg:leading-6">
                  {event.organiserDescription}
                </p>
              )}

              {(event.organiserEmail ||
                event.organiserPhone ||
                event.organiserWebsite) && (
                <div className="mt-3 space-y-2.5 border-t border-[#E7EBE9] pt-3 sm:mt-4 sm:space-y-3 sm:pt-4">
                  {event.organiserEmail && (
                    <a
                      href={`mailto:${event.organiserEmail}`}
                      className="flex items-center gap-2.5 break-all text-[10px] text-[#536B78] transition hover:text-[#063B59] sm:gap-3 sm:text-xs lg:text-sm"
                    >
                      <Mail size={14} className="shrink-0 text-[#B58B55]" />
                      {event.organiserEmail}
                    </a>
                  )}

                  {event.organiserPhone && (
                    <a
                      href={`tel:${event.organiserPhone}`}
                      className="flex items-center gap-2.5 text-[10px] text-[#536B78] transition hover:text-[#063B59] sm:gap-3 sm:text-xs lg:text-sm"
                    >
                      <Phone size={14} className="shrink-0 text-[#B58B55]" />
                      {event.organiserPhone}
                    </a>
                  )}

                  {event.organiserWebsite && (
                    <a
                      href={event.organiserWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 break-all text-[10px] text-[#536B78] transition hover:text-[#063B59] sm:gap-3 sm:text-xs lg:text-sm"
                    >
                      <Globe size={14} className="shrink-0 text-[#B58B55]" />
                      Organiser website
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* DATE, TIME AND COUNTDOWN */}

            <section className="rounded-xl border border-[#E8E9E5] bg-white p-4 shadow-[0_6px_22px_rgba(21,52,72,0.04)] sm:rounded-2xl sm:p-5 lg:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#B58B55] sm:text-[10px] sm:tracking-[0.18em]">
                    Event date
                  </p>

                  <p className="mt-2 font-serif text-xl font-bold text-[#153448] sm:text-2xl">
                    {startDate}
                  </p>

                  <p className="mt-1 text-[10px] text-[#71818A] sm:text-xs lg:text-sm">
                    {startTime || "Time to be announced"}
                    {endTime ? ` – ${endTime}` : ""}
                  </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F7F0E2] text-[#B58B00] sm:h-11 sm:w-11 sm:rounded-xl">
                  <CalendarDays size={20} />
                </div>
              </div>

              {showCountdown && (
                <div className="mt-4">
                  <EventCountdown startDate={event.startDate} now={now} />
                </div>
              )}

              {calendarUrl && (
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold text-[#0B5A78] transition hover:underline sm:mt-4 sm:text-xs lg:text-sm"
                >
                  <CalendarClock size={14} />
                  Add to calendar
                  <ExternalLink size={11} />
                </a>
              )}
            </section>

            {/* DESKTOP MAP */}

            <EventMap event={event} className="hidden lg:block" />

            {/* OPTIONAL TICKET INFORMATION */}

            {event.ticketInformation && (
              <div className="rounded-xl border border-[#E2E8E9] bg-white p-3.5 shadow-[0_6px_22px_rgba(21,52,72,0.035)] sm:rounded-2xl sm:p-4">
                <div className="flex items-center gap-2 text-[#B58B55]">
                  <Ticket size={16} />

                  <p className="text-[8px] font-bold uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.18em]">
                    Ticket information
                  </p>
                </div>

                <p className="mt-2.5 whitespace-pre-line text-[11px] leading-5 text-[#536B78] sm:mt-3 sm:text-xs sm:leading-6 lg:text-sm lg:leading-7">
                  {event.ticketInformation}
                </p>
              </div>
            )}
          </aside>
        </div>

        {/* BOTTOM CTA */}

        <section className="border-t border-[#E2E8E9] bg-[#F0EEE7]">
          <div className="mx-auto flex max-w-[1560px] flex-col items-start justify-between gap-4 px-4 py-7 sm:gap-5 sm:px-10 sm:py-10 md:flex-row md:items-center lg:px-14 xl:px-16">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#B58B55] sm:text-[10px] sm:tracking-[0.2em]">
                Keep exploring
              </p>

              <h2 className="mt-2 font-serif text-xl text-[#153448] sm:text-2xl lg:text-3xl">
                Discover more experiences in Kaduna.
              </h2>

              <p className="mt-2 text-[11px] leading-5 text-[#71818A] sm:text-xs">
                Find more events, destinations and experiences across Kaduna
                State.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/events"
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-[#063B59] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0B4D70] sm:min-h-11 sm:px-6 sm:py-3.5 sm:text-sm"
              >
                Explore events
                <ArrowRight size={15} />
              </Link>

              <Link
                href="/explore"
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[#07563D]/25 bg-white px-5 py-2.5 text-xs font-bold text-[#07563D] transition hover:bg-[#EDF4EF] sm:min-h-11 sm:px-6 sm:py-3.5 sm:text-sm"
              >
                Explore Kaduna
                <Compass size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* MOBILE STICKY TICKET BUTTON */}

        {canRegister && !isExpired && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E9E7] bg-white/95 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(21,52,72,0.10)] backdrop-blur-lg lg:hidden">
            <div className="mx-auto grid max-w-[680px] grid-cols-2 gap-2">
              <a
                href={event.ticketUrl || event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#F2BD42] px-3 text-[11px] font-extrabold text-[#173327] shadow-sm transition duration-200 active:scale-[0.99]"
              >
                <Ticket size={16} />
                {event.ticketUrl ? "Get tickets" : "Register now"}
                <ArrowRight size={14} />
              </a>
              {calendarUrl ? (
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#07563D] bg-white px-2 text-[11px] font-bold text-[#07563D] transition duration-200 active:scale-[0.99]"
                >
                  <CalendarClock size={16} />
                  Add to calendar
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("event-details")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#07563D] bg-white px-2 text-[11px] font-bold text-[#07563D]"
                >
                  <CalendarDays size={16} />
                  Event details
                </button>
              )}
            </div>
          </div>
        )}

        {/* EVENT ENDED OVERLAY */}
        {hasEnded && (
          <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-[110] flex items-center justify-center bg-[#FCFBF7]/45 px-4 py-6 backdrop-blur-[5px]"
          >
            <div className="w-full max-w-[420px] rounded-2xl border border-white/80 bg-white/95 px-6 py-7 text-center shadow-[0_24px_70px_rgba(9,47,73,0.20)] sm:px-9 sm:py-9">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F0E5] text-[#A87932]">
                <CalendarClock size={26} />
              </div>
              <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#A87932] sm:text-[10px]">
                Event update
              </p>
              <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-[#092F49] sm:text-3xl">
                This event has ended
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-xs leading-6 text-[#64748B] sm:text-sm">
                This event is no longer available to attend, but you can explore
                other exciting events happening across Kaduna.
              </p>
              <Link
                href="/events"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#063B59] px-6 text-xs font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#0B4D70]"
              >
                Explore other events
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[65vh] items-center justify-center bg-[#FCFBF7] px-5">
          <div className="flex items-center gap-3 text-sm text-[#71818A]">
            <LoaderCircle size={20} className="animate-spin text-[#07563D]" />
            Loading event...
          </div>
        </main>
      }
    >
      <EventDetailContent />
    </Suspense>
  );
}
