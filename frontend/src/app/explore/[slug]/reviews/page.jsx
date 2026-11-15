"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  LoaderCircle,
  MessageSquareText,
  Pencil,
  Send,
  Star,
  MapPin,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

import { apiRequest } from "@/lib/api";
import useDestinationReviews from "@/hooks/destination/useDestinationReviews";
import OptimizedImage from "@/components/OptimizedImage";

const REVIEWS_PER_PAGE = 10;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

function extractDestinations(response) {
  if (Array.isArray(response?.data?.destinations)) {
    return response.data.destinations;
  }

  if (Array.isArray(response?.data?.data?.destinations)) {
    return response.data.data.destinations;
  }

  if (Array.isArray(response?.destinations)) {
    return response.destinations;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDestinationImage(destination) {
  if (!destination) return "";

  const candidates = [
    destination.coverImage,
    destination.image,
    ...(Array.isArray(destination.images) ? destination.images : []),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }

    if (candidate?.url) return candidate.url;
  }

  return "";
}

function getDestinationLocation(destination) {
  if (!destination) return "";

  const address = destination.address;

  const addressText =
    typeof address === "string"
      ? address.trim()
      : [address?.street, address?.addressLine1, address?.addressLine2]
          .filter(Boolean)
          .join(", ");

  const candidates = [
    addressText,
    destination.lga,
    destination.city,
    destination.state,
    destination.country,
  ];

  const result = [];
  const seen = new Set();

  candidates.forEach((candidate) => {
    if (!candidate || typeof candidate !== "string") return;

    const value = candidate.trim().replace(/\s+/g, " ");
    const normalized = value.toLowerCase();

    if (!normalized || seen.has(normalized)) return;

    if (
      result.some((existing) => existing.toLowerCase().includes(normalized))
    ) {
      return;
    }

    result.push(value);
    seen.add(normalized);
  });

  return result.join(", ");
}

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getReviewerName(review) {
  const reviewer = review?.user;

  if (typeof reviewer === "object" && reviewer) {
    return reviewer.name || reviewer.fullName || "Traveler";
  }

  return "Traveler";
}

function getReviewerPhoto(review) {
  return typeof review?.user === "object" ? review.user?.photo || "" : "";
}

function RatingStars({ value = 0, size = 16 }) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= value
              ? "fill-[#D9A21B] text-[#D9A21B]"
              : "fill-transparent text-[#D8DED8]"
          }
        />
      ))}
    </div>
  );
}

function InteractiveStars({ value, onChange }) {
  return (
    <div
      className="flex items-center gap-2"
      role="radiogroup"
      aria-label="Choose your rating"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          aria-checked={value === star}
          role="radio"
          className="rounded-md transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A21B]"
        >
          <Star
            size={26}
            className={
              star <= value ? "fill-[#D9A21B] text-[#D9A21B]" : "text-[#D8DED8]"
            }
          />
        </button>
      ))}
    </div>
  );
}

function RatingBreakdown({ statistics }) {
  const total = Number(statistics?.totalReviews || 0);
  const breakdown = statistics?.ratingBreakdown || {};

  return (
    <div className="space-y-2.5">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = Number(breakdown[rating] || 0);
        const percentage = total > 0 ? (count / total) * 100 : 0;

        return (
          <div key={rating} className="flex items-center gap-3">
            <span className="w-3 text-right text-xs font-medium text-[#52645A]">
              {rating}
            </span>

            <Star size={13} className="fill-[#D9A21B] text-[#D9A21B]" />

            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E9EDE9]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="h-full rounded-full bg-[#D9A21B]"
              />
            </div>

            <span className="w-7 text-right text-xs text-[#87938B]">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ReviewCard({ review, index, shouldReduceMotion }) {
  const reviewerName = getReviewerName(review);
  const reviewerPhoto = getReviewerPhoto(review);
  const photos = Array.isArray(review.photos) ? review.photos : [];

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.5,
        delay: shouldReduceMotion ? 0 : Math.min(index * 0.055, 0.22),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      className="group rounded-xl border border-[#E8ECE8] bg-white p-4 shadow-[0_4px_18px_rgba(23,75,53,0.035)] transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(23,75,53,0.09)] sm:rounded-2xl sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF1EB] text-sm font-semibold text-[#174B35] sm:h-11 sm:w-11">
            {reviewerPhoto ? (
              <OptimizedImage
                src={reviewerPhoto}
                alt={reviewerName}
                width={44}
                height={44}
                sizes="44px"
                className="h-full w-full object-cover"
              />
            ) : (
              reviewerName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-[var(--font-inter)] text-sm font-semibold text-[#263D30]">
              {reviewerName}
            </h3>

            <p className="mt-1 text-[11px] text-[#929D94] sm:text-xs">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        <RatingStars value={Number(review.rating) || 0} size={13} />
      </div>

      <p className="mt-4 whitespace-pre-line break-words font-[var(--font-inter)] text-[13px] leading-6 text-[#65746A] sm:text-sm sm:leading-7">
        {review.review}
      </p>

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo, photoIndex) => {
            if (!photo?.url) return null;

            return (
              <a
                key={photo.publicId || photo.url || photoIndex}
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/photo relative aspect-square overflow-hidden rounded-lg bg-[#F1F4F1] sm:rounded-xl"
              >
                <OptimizedImage
                  src={photo.url}
                  alt={photo.alt || `Review photo ${photoIndex + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, 25vw"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                />
              </a>
            );
          })}
        </div>
      )}
    </motion.article>
  );
}

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const currentPage = pagination.currentPage || 1;
  const totalPages = pagination.totalPages || 1;

  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 2) {
    end = Math.min(totalPages, 5);
  }

  if (currentPage >= totalPages - 1) {
    start = Math.max(1, totalPages - 4);
  }

  const pages = [];

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return (
    <nav
      aria-label="Review pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:mt-10"
    >
      <button
        type="button"
        disabled={!pagination.hasPreviousPage}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-[#E1E7E1] px-3 text-xs font-medium text-[#52645A] transition hover:border-[#174B35] hover:text-[#174B35] disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:px-4 sm:text-sm"
      >
        <ArrowLeft size={14} />
        Previous
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`h-9 min-w-9 rounded-full px-3 text-xs font-semibold transition sm:h-10 sm:min-w-10 sm:text-sm ${
            page === currentPage
              ? "bg-[#174B35] text-white shadow-md"
              : "border border-[#E1E7E1] text-[#52645A] hover:border-[#174B35] hover:text-[#174B35]"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        disabled={!pagination.hasNextPage}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-[#E1E7E1] px-3 text-xs font-medium text-[#52645A] transition hover:border-[#174B35] hover:text-[#174B35] disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:px-4 sm:text-sm"
      >
        Next
        <ArrowRight size={14} />
      </button>
    </nav>
  );
}

function DestinationAllReviewsContent() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const shouldReduceMotion = useReducedMotion();

  const [destination, setDestination] = useState(null);
  const [destinationLoading, setDestinationLoading] = useState(true);
  const [destinationError, setDestinationError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRating, setSelectedRating] = useState("");
  const [selectedSort, setSelectedSort] = useState("newest");

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDestination() {
      if (!slug) return;

      setDestinationLoading(true);
      setDestinationError("");

      try {
        const response = await apiRequest("destinations");
        const destinations = extractDestinations(response);
        const decodedSlug = decodeURIComponent(slug);

        const foundDestination = destinations.find((item) => {
          const itemSlug = String(item.slug || "");
          const itemId = String(item._id || item.id || "");

          return (
            itemSlug === decodedSlug ||
            itemId === decodedSlug ||
            slugify(item.name) === decodedSlug
          );
        });

        if (!foundDestination) {
          throw new Error("We couldn't find this destination.");
        }

        if (active) setDestination(foundDestination);
      } catch (error) {
        if (active) {
          setDestinationError(
            error?.message || "Unable to load this destination.",
          );
        }
      } finally {
        if (active) setDestinationLoading(false);
      }
    }

    loadDestination();

    return () => {
      active = false;
    };
  }, [slug]);

  const {
    reviews,
    loading,
    submitting,
    error,
    successMessage,
    clearMessages,
    isAuthenticated,
    authStatus,
    ratingStats,
    pagination,
    createReview,
  } = useDestinationReviews(destination, {
    page: currentPage,
    limit: REVIEWS_PER_PAGE,
    rating: selectedRating,
    sort: selectedSort,
    pagination: true,
  });

  const destinationName = destination?.name || "Destination";

  const destinationImage = useMemo(
    () => getDestinationImage(destination),
    [destination],
  );

  const destinationLocation = useMemo(
    () => getDestinationLocation(destination),
    [destination],
  );

  const destinationUrl = `/explore/${encodeURIComponent(slug || "")}`;

  const loginUrl = `/login?returnTo=${encodeURIComponent(
    `${destinationUrl}/reviews`,
  )}`;

  const handleRatingFilter = (value) => {
    setSelectedRating((current) =>
      current === String(value) ? "" : String(value),
    );

    setCurrentPage(1);
  };

  const handleSortChange = (event) => {
    setSelectedSort(event.target.value);
    setCurrentPage(1);
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    setFormError("");
    setFormSuccess("");
    clearMessages?.();

    const trimmedText = newReviewText.trim();

    if (!newRating) {
      setFormError("Please select a star rating.");
      return;
    }

    if (trimmedText.length < 3) {
      setFormError("Your review must contain at least 3 characters.");
      return;
    }

    if (trimmedText.length > 2000) {
      setFormError("Your review cannot exceed 2000 characters.");
      return;
    }

    try {
      await createReview({
        review: trimmedText,
        rating: newRating,
        destination: destination?._id || destination?.id,
      });

      setNewRating(0);
      setNewReviewText("");
      setFormSuccess("Your review has been submitted.");
      setShowReviewForm(false);
      setCurrentPage(1);
    } catch (submitError) {
      setFormError(
        submitError?.message ||
          "Unable to submit your review. Please try again.",
      );
    }
  };

  const openWriteReview = () => {
    if (!isAuthenticated) {
      window.location.assign(loginUrl);
      return;
    }

    setShowReviewForm(true);

    window.setTimeout(() => {
      document.getElementById("write-review-form")?.scrollIntoView({
        behavior: shouldReduceMotion ? "auto" : "smooth",
        block: "center",
      });
    }, 100);
  };

  if (destinationLoading) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-[#FAF9F6] px-5">
        <div className="flex items-center gap-3 text-sm text-[#718078]">
          <LoaderCircle size={20} className="animate-spin text-[#174B35]" />
          Loading destination reviews...
        </div>
      </main>
    );
  }

  if (destinationError || !destination) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-[#FAF9F6] px-5">
        <div className="max-w-md text-center">
          <MessageSquareText size={28} className="mx-auto text-[#174B35]" />

          <h1 className="mt-4 font-[var(--font-playfair)] text-2xl font-semibold text-[#174B35]">
            Destination unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718078]">
            {destinationError || "We couldn't load this destination."}
          </p>

          <Link
            href="/explore"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#174B35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#103A29]"
          >
            <ArrowLeft size={14} />
            Back to Explore
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF9F6] pb-16 sm:pb-20">
      {/* Destination hero: actual destination image as the cover */}

      <section className="relative isolate flex min-h-[250px] items-end overflow-hidden bg-[#153D2D] sm:min-h-[310px] lg:min-h-[350px]">
        {destinationImage && (
          <OptimizedImage
            src={destinationImage}
            alt={destinationName}
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
        )}

        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#102C20]/90 via-[#102C20]/40 to-black/10" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-7 pt-16 sm:px-6 sm:pb-9 sm:pt-20 lg:px-8">
          <Link
            href={destinationUrl}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/25 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
          >
            <ArrowLeft size={14} />
            Back to destination
          </Link>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.55,
            }}
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F5C65C] sm:text-xs">
              Visitor experiences
            </p>

            <h1 className="max-w-3xl font-[var(--font-playfair)] text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
              Reviews of {destinationName}
            </h1>

            {destinationLocation && (
              <p className="mt-3 flex max-w-2xl items-start gap-2 text-xs leading-5 text-white/85 sm:text-sm">
                <MapPin size={15} className="mt-0.5 shrink-0" />
                <span>{destinationLocation}</span>
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Rating summary */}

        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.5,
          }}
          className="relative z-10 -mt-5 grid gap-5 rounded-xl border border-[#E8ECE8] bg-white p-4 shadow-[0_12px_36px_rgba(23,75,53,0.07)] sm:-mt-7 sm:grid-cols-[0.7fr_1.3fr] sm:gap-7 sm:rounded-2xl sm:p-6 lg:p-7"
        >
          <div className="flex flex-col justify-center border-b border-[#E8ECE8] pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#87938B] sm:text-xs">
              Overall rating
            </p>

            <div className="mt-2 flex items-end gap-2">
              <span className="font-[var(--font-playfair)] text-5xl font-semibold leading-none text-[#174B35] sm:text-6xl">
                {Number(ratingStats?.averageRating || 0).toFixed(1)}
              </span>

              <span className="pb-1 text-xs text-[#87938B] sm:text-sm">
                / 5
              </span>
            </div>

            <div className="mt-3">
              <RatingStars
                value={Math.round(Number(ratingStats?.averageRating || 0))}
                size={17}
              />
            </div>

            <p className="mt-2 text-xs text-[#718078] sm:text-sm">
              {ratingStats?.totalReviews || 0} visitor{" "}
              {ratingStats?.totalReviews === 1 ? "review" : "reviews"}
            </p>
          </div>

          <div className="flex items-center">
            <div className="w-full max-w-xl">
              <RatingBreakdown statistics={ratingStats} />
            </div>
          </div>
        </motion.section>

        {/* Review heading and write action */}

        <div className="mt-8 flex flex-col justify-between gap-3 sm:mt-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-[var(--font-playfair)] text-xl font-semibold text-[#174B35] sm:text-2xl">
              What visitors are saying
            </h2>

            <p className="mt-1.5 text-xs leading-5 text-[#87938B] sm:text-sm">
              Experiences shared by people who have visited this place.
            </p>
          </div>

          <button
            type="button"
            onClick={openWriteReview}
            className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-full bg-[#174B35] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_6px_18px_rgba(23,75,53,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#103A29] hover:shadow-lg active:translate-y-0 sm:min-h-11 sm:px-5 sm:text-sm"
          >
            <Pencil size={14} />
            Write a review
          </button>
        </div>

        {/* Review form */}

        <AnimatePresence initial={false}>
          {showReviewForm && isAuthenticated && (
            <motion.section
              id="write-review-form"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: 14 }}
              className="mt-6 rounded-xl border border-[#E4EAE4] bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-[var(--font-playfair)] text-lg font-semibold text-[#174B35] sm:text-xl">
                    Share your experience
                  </h3>

                  <p className="mt-1 text-xs text-[#87938B] sm:text-sm">
                    Your honest review can help another visitor.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  aria-label="Close review form"
                  className="rounded-full p-2 text-[#718078] transition hover:bg-[#F1F4F1]"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
              </div>

              <form onSubmit={handleSubmitReview}>
                <label className="mb-2 block text-xs font-semibold text-[#38483E] sm:text-sm">
                  Your rating
                </label>

                <InteractiveStars value={newRating} onChange={setNewRating} />

                <label
                  htmlFor="all-reviews-comment"
                  className="mb-2 mt-5 block text-xs font-semibold text-[#38483E] sm:text-sm"
                >
                  Your review
                </label>

                <textarea
                  id="all-reviews-comment"
                  value={newReviewText}
                  onChange={(event) => setNewReviewText(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Describe your experience..."
                  className="w-full resize-y rounded-xl border border-[#E1E7E1] bg-[#FCFDFC] px-3.5 py-3 text-xs leading-6 text-[#38483E] outline-none transition placeholder:text-[#A0AAA2] focus:border-[#174B35] focus:ring-2 focus:ring-[#174B35]/10 sm:px-4 sm:text-sm"
                />

                <div className="mt-1.5 flex justify-end text-[11px] text-[#929D94]">
                  {newReviewText.length}/2000
                </div>

                {formError && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#FFF3F0] p-3 text-xs text-[#A64A3B]">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#EDF6EE] p-3 text-xs text-[#27613D]">
                    <CheckCircle2 size={15} />
                    {formSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#174B35] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#103A29] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle size={14} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Submit review
                    </>
                  )}
                </button>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        {authStatus === "checking" && (
          <p className="mt-3 text-xs text-[#87938B]">
            Checking your account...
          </p>
        )}

        {!isAuthenticated && authStatus !== "checking" && (
          <p className="mt-2 text-xs text-[#87938B]">
            Sign in to submit a review.
          </p>
        )}

        {successMessage && !showReviewForm && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#EDF6EE] p-3 text-xs text-[#27613D]">
            <CheckCircle2 size={15} />
            {successMessage}
          </div>
        )}

        {/* Filters and sorting */}

        <section className="mt-7 border-y border-[#E7EBE6] py-4 sm:mt-8 sm:py-5">
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#87938B] sm:text-xs">
                Filter by rating
              </p>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRating("");
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-3 py-2 text-[11px] font-semibold transition sm:px-4 sm:text-xs ${
                    selectedRating === ""
                      ? "bg-[#174B35] text-white"
                      : "border border-[#E1E7E1] bg-white text-[#52645A] hover:border-[#174B35]"
                  }`}
                >
                  All ratings
                </button>

                {[5, 4, 3, 2, 1].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSelectedRating((current) =>
                        current === String(value) ? "" : String(value),
                      );
                      setCurrentPage(1);
                    }}
                    aria-pressed={selectedRating === String(value)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-semibold transition sm:px-3.5 sm:text-xs ${
                      selectedRating === String(value)
                        ? "bg-[#174B35] text-white"
                        : "border border-[#E1E7E1] bg-white text-[#52645A] hover:border-[#174B35]"
                    }`}
                  >
                    {value}
                    <Star size={11} className="fill-[#D9A21B] text-[#D9A21B]" />
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full sm:max-w-[220px]">
              <label
                htmlFor="review-sort"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#87938B] sm:text-xs"
              >
                Sort reviews
              </label>

              <div className="relative">
                <select
                  id="review-sort"
                  value={selectedSort}
                  onChange={(event) => {
                    setSelectedSort(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-[#E1E7E1] bg-white px-3.5 py-2.5 pr-9 text-xs font-medium text-[#52645A] outline-none transition focus:border-[#174B35] sm:text-sm"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718078]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Reviews */}

        <section className="mt-6 sm:mt-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-[var(--font-playfair)] text-lg font-semibold text-[#174B35] sm:text-xl">
                Visitor stories
              </h3>

              <p className="mt-1 text-[11px] text-[#87938B] sm:text-xs">
                {pagination
                  ? `${pagination.totalResults} reviews found`
                  : `${ratingStats?.totalReviews || 0} reviews`}
                {selectedRating ? ` · ${selectedRating}-star reviews` : ""}
              </p>
            </div>

            {selectedRating && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRating("");
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-[#174B35] underline underline-offset-4"
              >
                Clear filter
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-44 items-center justify-center rounded-xl border border-[#E8ECE8] bg-white sm:min-h-52 sm:rounded-2xl">
              <div className="flex items-center gap-3 text-xs text-[#718078] sm:text-sm">
                <LoaderCircle
                  size={18}
                  className="animate-spin text-[#174B35]"
                />
                Loading reviews...
              </div>
            </div>
          ) : error && reviews.length === 0 ? (
            <div className="rounded-xl border border-[#E8ECE8] bg-white px-5 py-10 text-center sm:rounded-2xl">
              <AlertCircle size={24} className="mx-auto text-[#A64A3B]" />

              <p className="mt-3 text-xs text-[#718078] sm:text-sm">{error}</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DCE4DC] bg-white px-5 py-12 text-center sm:rounded-2xl sm:py-14">
              <MessageSquareText size={26} className="mx-auto text-[#87938B]" />

              <h3 className="mt-3 font-[var(--font-playfair)] text-lg font-semibold text-[#174B35] sm:text-xl">
                No reviews found
              </h3>

              <p className="mt-2 text-xs text-[#87938B] sm:text-sm">
                {selectedRating
                  ? "There are no reviews with this rating yet. Try another filter."
                  : "Be the first visitor to share an experience at this destination."}
              </p>

              {selectedRating && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRating("");
                    setCurrentPage(1);
                  }}
                  className="mt-4 rounded-full bg-[#174B35] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#103A29]"
                >
                  View all reviews
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:space-y-4">
                {reviews.map((review, index) => (
                  <ReviewCard
                    key={review._id || review.id}
                    review={review}
                    index={index}
                    shouldReduceMotion={shouldReduceMotion}
                  />
                ))}
              </div>

              <Pagination
                pagination={pagination}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </section>

        {/* Back to destination */}

        <div className="mt-9 flex justify-center sm:mt-12">
          <Link
            href={destinationUrl}
            className="inline-flex items-center gap-2 rounded-full border border-[#174B35] px-4 py-2.5 text-xs font-semibold text-[#174B35] transition hover:bg-[#EDF3EE] sm:px-5 sm:py-3 sm:text-sm"
          >
            <ArrowLeft size={14} />
            Back to {destinationName}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function DestinationAllReviewsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[65vh] items-center justify-center bg-[#FAF9F6] px-5">
          <div className="flex items-center gap-3 text-sm text-[#718078]">
            <LoaderCircle size={20} className="animate-spin text-[#174B35]" />
            Loading destination reviews...
          </div>
        </main>
      }
    >
      <DestinationAllReviewsContent />
    </Suspense>
  );
}
