"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useDestinationReviews from "@/hooks/destination/useDestinationReviews";
import OptimizedImage from "@/components/OptimizedImage";

import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Pencil,
  Send,
  Star,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";

import { motion, AnimatePresence, useReducedMotion } from "motion/react";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getUserId(user) {
  if (!user) return null;
  if (typeof user === "string") return user;
  return user._id || user.id || null;
}

function getReviewerName(review) {
  const user = review?.user;

  if (typeof user === "object" && user) {
    return user.name || user.fullName || "Traveler";
  }

  return "Traveler";
}

function getReviewerInitial(review) {
  return getReviewerName(review).charAt(0).toUpperCase();
}

function formatReviewDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getReviewPhotos(review) {
  return Array.isArray(review?.photos) ? review.photos : [];
}

function RatingStars({ value = 0, size = 16, interactive = false, onChange }) {
  return (
    <div
      className="flex items-center gap-1"
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Choose a rating" : `${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          aria-checked={interactive ? value === star : undefined}
          role={interactive ? "radio" : undefined}
          className={
            interactive
              ? "cursor-pointer rounded transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A21B]"
              : "cursor-default"
          }
        >
          <Star
            size={size}
            className={
              star <= value
                ? "fill-[#D9A21B] text-[#D9A21B] transition-colors duration-200"
                : "fill-transparent text-[#D8DCD8] transition-colors duration-200"
            }
          />
        </button>
      ))}
    </div>
  );
}

function RatingDistribution({ breakdown, total }) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = breakdown?.[rating] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;

        return (
          <div key={rating} className="flex items-center gap-3 text-sm">
            <span className="w-3 text-right font-medium text-[#52645A]">
              {rating}
            </span>

            <Star
              size={13}
              className="shrink-0 fill-[#D9A21B] text-[#D9A21B]"
            />

            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E9EDE9]">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${percentage}%` }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.7,
                  ease: "easeOut",
                }}
                className="h-full rounded-full bg-[#D9A21B]"
              />
            </div>

            <span className="w-7 text-right text-xs text-[#849087]">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ReviewPhotoGallery({ photos, shouldReduceMotion }) {
  if (!photos?.length) return null;

  return (
    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {photos.map((photo, index) => {
        if (!photo?.url) return null;

        return (
          <motion.a
            key={photo.publicId || photo.url || index}
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open review photo ${index + 1}`}
            whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="group relative aspect-square overflow-hidden rounded-lg border border-[#E8ECE8] bg-[#F5F7F4] sm:rounded-xl"
          >
            <OptimizedImage
              src={photo.url}
              alt={photo.alt || `Visitor review photo ${index + 1}`}
              fill
              sizes="(max-width: 639px) 33vw, (max-width: 767px) 25vw, 20vw"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            />
          </motion.a>
        );
      })}
    </div>
  );
}

export default function DestinationReviews({ destination }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  const {
    reviews = [],
    loading,
    submitting,
    error,
    successMessage,
    clearMessages,
    isAuthenticated,
    authStatus,
    user,
    averageRating = 0,
    totalReviews = 0,
    ratingBreakdown = {},
    currentUserReview,
    createReview,
    updateReview,
    deleteReview,
    refreshReviews,
  } = useDestinationReviews(destination);

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [formError, setFormError] = useState("");

  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [removePhotoPublicIds, setRemovePhotoPublicIds] = useState([]);
  const [photoError, setPhotoError] = useState("");
  const [photoPreviews, setPhotoPreviews] = useState([]);

  const currentUserId = getUserId(user);

  const currentReview = useMemo(() => {
    if (currentUserReview) return currentUserReview;

    return (
      reviews.find((review) => getUserId(review.user) === currentUserId) || null
    );
  }, [currentUserReview, reviews, currentUserId]);

  const isOwner = (review) =>
    Boolean(currentUserId && getUserId(review?.user) === currentUserId);

  const loginUrl = `/login?returnTo=${encodeURIComponent(
    pathname || "/explore",
  )}`;

  const signupUrl = `/signup?returnTo=${encodeURIComponent(
    pathname || "/explore",
  )}`;

  const existingReviewPhotos = getReviewPhotos(currentReview);

  useEffect(() => {
    const previews = selectedPhotos.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPhotoPreviews(previews);

    return () => {
      previews.forEach((preview) => {
        URL.revokeObjectURL(preview.url);
      });
    };
  }, [selectedPhotos]);

  const resetPhotoState = () => {
    setSelectedPhotos([]);
    setRemovePhotoPublicIds([]);
    setPhotoError("");
  };

  const beginEditing = () => {
    if (!currentReview) return;

    clearMessages?.();
    setFormError("");
    setPhotoError("");

    setRating(Number(currentReview.rating) || 0);
    setReviewText(currentReview.review || "");

    setSelectedPhotos([]);
    setRemovePhotoPublicIds([]);

    setIsEditing(true);
    setConfirmDeleteId(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setRating(0);
    setReviewText("");
    setFormError("");

    resetPhotoState();
    clearMessages?.();
  };

  const handlePhotoSelection = (event) => {
    const files = Array.from(event.target.files || []);

    setPhotoError("");

    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
        errors.push(`${file.name}: use JPG, PNG, or WebP.`);
        return;
      }

      if (file.size > MAX_PHOTO_SIZE) {
        errors.push(`${file.name}: maximum size is 5 MB.`);
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setSelectedPhotos((current) => [...current, ...validFiles]);
    }

    if (errors.length > 0) {
      setPhotoError(errors.join(" "));
    }

    event.target.value = "";
  };

  const removeSelectedPhoto = (indexToRemove) => {
    setSelectedPhotos((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  };

  const toggleExistingPhotoRemoval = (publicId) => {
    if (!publicId) return;

    setRemovePhotoPublicIds((current) =>
      current.includes(publicId)
        ? current.filter((id) => id !== publicId)
        : [...current, publicId],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setPhotoError("");
    clearMessages?.();

    const trimmedReview = reviewText.trim();

    if (rating < 1 || rating > 5) {
      setFormError("Please select a rating.");
      return;
    }

    if (trimmedReview.length < 3) {
      setFormError("Your review must contain at least 3 characters.");
      return;
    }

    if (trimmedReview.length > 2000) {
      setFormError("Your review cannot exceed 2000 characters.");
      return;
    }

    try {
      if (isEditing && currentReview) {
        await updateReview(currentReview._id || currentReview.id, {
          review: trimmedReview,
          rating,
          photos: selectedPhotos,
          removePhotoPublicIds,
        });

        setIsEditing(false);
      } else {
        await createReview({
          review: trimmedReview,
          rating,
          photos: selectedPhotos,
          destination: destination?._id || destination?.id,
        });
      }

      setReviewText("");
      setRating(0);
      resetPhotoState();
    } catch (err) {
      setFormError(
        err?.message || "We could not submit your review. Please try again.",
      );
    }
  };

  const handleDelete = async (reviewId) => {
    if (!reviewId) return;

    setFormError("");
    clearMessages?.();

    try {
      await deleteReview(reviewId);

      setConfirmDeleteId(null);
      setIsEditing(false);
      setRating(0);
      setReviewText("");
      resetPhotoState();
    } catch (err) {
      setFormError(
        err?.message || "We could not delete your review. Please try again.",
      );
    }
  };

  const handleRefresh = async () => {
    clearMessages?.();
    setFormError("");
    await refreshReviews();
  };

  const showReviewForm = isAuthenticated && (!currentReview || isEditing);

  // Only 3 reviews are displayed in the destination preview.
  const previewReviews = reviews.slice(0, 3);

  const reviewsPageUrl = destination?.slug
    ? `/explore/${encodeURIComponent(destination.slug)}/reviews`
    : null;

  const revealAnimation = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.15 },
        transition: {
          duration: 0.55,
          ease: [0.22, 1, 0.36, 1],
        },
      };

  return (
    <section
      id="destination-reviews"
      className="scroll-mt-28 py-8 sm:py-10 lg:py-14"
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Section heading */}

        <div className="mb-6 flex flex-col gap-3 sm:mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#A47A17] sm:text-sm">
            <MessageSquareText size={17} />
            Visitor experiences
          </div>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-[var(--font-playfair)] text-2xl font-semibold text-[#174B35] sm:text-3xl lg:text-4xl">
                Reviews & Ratings
              </h2>

              <p className="mt-2 max-w-xl font-[var(--font-inter)] text-xs leading-6 text-[#718078] sm:text-sm sm:leading-7">
                Read experiences from visitors and share your own experience at
                this destination.
              </p>
            </div>

            <div className="font-[var(--font-inter)] text-xs text-[#718078] sm:text-sm">
              {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
            </div>
          </div>
        </div>

        {/* Rating summary */}

        <motion.div
          {...revealAnimation}
          className="mb-6 grid gap-5 rounded-xl border border-[#E8ECE8] bg-[#FAFBF9] p-4 sm:mb-8 sm:grid-cols-[0.8fr_1.2fr] sm:rounded-2xl sm:p-5 lg:p-7"
        >
          <div className="flex flex-col justify-center border-b border-[#E8ECE8] pb-5 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-7">
            <div className="flex items-end gap-2">
              <span className="font-[var(--font-playfair)] text-4xl font-semibold leading-none text-[#174B35] sm:text-5xl">
                {Number(averageRating).toFixed(1)}
              </span>

              <span className="pb-1 text-xs text-[#87938B] sm:text-sm">
                / 5
              </span>
            </div>

            <div className="mt-3">
              <RatingStars value={Math.round(averageRating)} size={19} />
            </div>

            <p className="mt-3 font-[var(--font-inter)] text-xs text-[#718078] sm:text-sm">
              Based on {totalReviews}{" "}
              {totalReviews === 1 ? "visitor review" : "visitor reviews"}
            </p>
          </div>

          <div className="flex items-center">
            <div className="w-full max-w-lg">
              <RatingDistribution
                breakdown={ratingBreakdown}
                total={totalReviews}
              />
            </div>
          </div>
        </motion.div>

        {/* Authentication state */}

        {authStatus === "checking" && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#E8ECE8] p-4 text-xs text-[#718078] sm:text-sm">
            <LoaderCircle size={17} className="animate-spin" />
            Checking your account...
          </div>
        )}

        {/* Login prompt */}

        {authStatus !== "checking" && !isAuthenticated && (
          <motion.div
            {...revealAnimation}
            className="mb-7 flex flex-col gap-4 rounded-xl border border-[#E8ECE8] bg-white p-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:p-5 lg:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDF3EE] text-[#174B35]">
                <LockKeyhole size={19} />
              </div>

              <div>
                <h3 className="font-[var(--font-playfair)] text-base font-semibold text-[#174B35] sm:text-lg">
                  Share your experience
                </h3>

                <p className="mt-1 text-xs leading-5 text-[#718078] sm:text-sm sm:leading-6">
                  Sign in to rate this destination and write a review.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={loginUrl}
                className="rounded-full border border-[#174B35] px-4 py-2 text-xs font-semibold text-[#174B35] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#EDF3EE] active:translate-y-0 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Sign in
              </Link>

              <Link
                href={signupUrl}
                className="rounded-full bg-[#174B35] px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#103A29] active:translate-y-0 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Create account
              </Link>
            </div>
          </motion.div>
        )}

        {/* Existing review notice */}

        {isAuthenticated && currentReview && !isEditing && (
          <motion.div
            {...revealAnimation}
            className="mb-7 rounded-xl border border-[#DCE8DE] bg-[#F5F8F4] p-4 sm:mb-8 sm:rounded-2xl sm:p-5 lg:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#174B35] sm:text-sm">
                  <CheckCircle2 size={17} />
                  You have reviewed this destination
                </div>

                <p className="mt-2 text-xs text-[#718078] sm:text-sm">
                  You can update or remove your review at any time.
                </p>
              </div>

              <button
                type="button"
                onClick={beginEditing}
                className="inline-flex w-fit items-center gap-2 rounded-full border border-[#174B35] px-4 py-2 text-xs font-semibold text-[#174B35] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white active:translate-y-0 sm:py-2.5 sm:text-sm"
              >
                <Pencil size={15} />
                Edit review
              </button>
            </div>
          </motion.div>
        )}

        {/* Review form */}

        <AnimatePresence initial={false}>
          {showReviewForm && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
              transition={{ duration: 0.3 }}
              className="mb-8 rounded-xl border border-[#E8ECE8] bg-white p-4 shadow-[0_8px_30px_rgba(23,75,53,0.04)] sm:mb-10 sm:rounded-2xl sm:p-5 lg:p-7"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-[var(--font-playfair)] text-lg font-semibold text-[#174B35] sm:text-xl">
                    {isEditing ? "Edit your review" : "Write a review"}
                  </h3>

                  <p className="mt-1 text-xs text-[#87938B] sm:text-sm">
                    Your experience helps other visitors.
                  </p>
                </div>

                {isEditing && (
                  <button
                    type="button"
                    onClick={cancelEditing}
                    aria-label="Cancel editing"
                    className="rounded-full p-2 text-[#718078] transition-all duration-200 hover:rotate-90 hover:bg-[#F1F4F1]"
                  >
                    <X size={19} />
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                {/* Rating */}

                <div className="mb-5">
                  <label className="mb-3 block text-xs font-semibold text-[#38483E] sm:text-sm">
                    Your rating
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <RatingStars
                      value={rating}
                      size={25}
                      interactive
                      onChange={setRating}
                    />

                    <span className="text-xs text-[#87938B] sm:text-sm">
                      {rating > 0 ? `${rating} out of 5` : "Select a rating"}
                    </span>
                  </div>
                </div>

                {/* Review text */}

                <div className="mb-5">
                  <label
                    htmlFor="destination-review-text"
                    className="mb-2 block text-xs font-semibold text-[#38483E] sm:text-sm"
                  >
                    Your experience
                  </label>

                  <textarea
                    id="destination-review-text"
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    placeholder="Tell other visitors what your experience was like..."
                    rows={5}
                    maxLength={2000}
                    required
                    className="w-full resize-y rounded-xl border border-[#E1E7E1] bg-[#FCFDFC] px-3.5 py-3 font-[var(--font-inter)] text-xs leading-6 text-[#38483E] outline-none transition-all duration-300 placeholder:text-[#A0AAA2] focus:border-[#174B35] focus:ring-2 focus:ring-[#174B35]/10 sm:px-4 sm:text-sm sm:leading-7"
                  />

                  <div className="mt-2 flex justify-between text-[10px] text-[#929D94] sm:text-xs">
                    <span>Minimum 3 characters</span>
                    <span>{reviewText.length}/2000</span>
                  </div>
                </div>

                {/* Existing photos when editing */}

                {isEditing && existingReviewPhotos.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-3 text-xs font-semibold text-[#38483E] sm:text-sm">
                      Current photos
                    </p>

                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {existingReviewPhotos.map((photo, index) => {
                        const isMarkedForRemoval =
                          removePhotoPublicIds.includes(photo.publicId);

                        return (
                          <div
                            key={photo.publicId || photo.url || index}
                            className="group/photo relative aspect-square overflow-hidden rounded-lg border border-[#E8ECE8] bg-[#F5F7F4] sm:rounded-xl"
                          >
                            <OptimizedImage
                              src={photo.url}
                              alt={
                                photo.alt ||
                                `Existing review photo ${index + 1}`
                              }
                              fill
                              sizes="(max-width: 639px) 33vw, (max-width: 767px) 25vw, 20vw"
                              className={`h-full w-full object-cover transition-all duration-300 ${
                                isMarkedForRemoval
                                  ? "scale-95 opacity-30 grayscale"
                                  : "group-hover/photo:scale-110"
                              }`}
                            />

                            {photo.publicId && (
                              <button
                                type="button"
                                onClick={() =>
                                  toggleExistingPhotoRemoval(photo.publicId)
                                }
                                aria-label={
                                  isMarkedForRemoval
                                    ? "Keep this photo"
                                    : "Remove this photo"
                                }
                                className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-white shadow transition-all duration-200 hover:scale-110 active:scale-95 ${
                                  isMarkedForRemoval
                                    ? "bg-[#174B35]"
                                    : "bg-[#A64A3B]"
                                }`}
                              >
                                {isMarkedForRemoval ? (
                                  <RefreshCw size={13} />
                                ) : (
                                  <X size={15} />
                                )}
                              </button>
                            )}

                            {isMarkedForRemoval && (
                              <span className="absolute inset-x-1 bottom-2 text-center text-[10px] font-semibold text-[#A64A3B]">
                                Will be removed
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add photos */}

                <div className="mb-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-[#38483E] sm:text-sm">
                      Add photos
                      <span className="ml-2 font-normal text-[#929D94]">
                        (optional)
                      </span>
                    </label>

                    <span className="text-[10px] text-[#929D94] sm:text-xs">
                      JPG, PNG or WebP · Max 5 MB per photo
                    </span>
                  </div>

                  <label
                    htmlFor="destination-review-photos"
                    className="group/upload flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#C9D7CB] bg-[#FAFBF9] px-4 py-5 text-center transition-all duration-300 hover:border-[#174B35] hover:bg-[#F3F7F2] sm:py-6"
                  >
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF1EB] text-[#174B35] transition-transform duration-300 group-hover/upload:scale-110">
                      <ImagePlus size={20} />
                    </div>

                    <span className="text-xs font-semibold text-[#174B35] sm:text-sm">
                      Choose photos
                    </span>

                    <span className="mt-1 text-[11px] text-[#87938B] sm:text-xs">
                      Select multiple images from your device
                    </span>
                  </label>

                  <input
                    id="destination-review-photos"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoSelection}
                    className="sr-only"
                  />

                  {/* New photo previews */}

                  {photoPreviews.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#52645A]">
                          Selected photos
                        </p>

                        <span className="text-xs text-[#929D94]">
                          {photoPreviews.length} selected
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
                        {photoPreviews.map((preview, index) => (
                          <motion.div
                            key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
                            initial={
                              shouldReduceMotion
                                ? false
                                : { opacity: 0, scale: 0.9 }
                            }
                            animate={{ opacity: 1, scale: 1 }}
                            className="group/preview relative aspect-square overflow-hidden rounded-lg border border-[#E8ECE8] bg-[#F5F7F4] sm:rounded-xl"
                          >
                            <img
                              src={preview.url}
                              alt={preview.file.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover/preview:scale-110"
                            />

                            <button
                              type="button"
                              onClick={() => removeSelectedPhoto(index)}
                              aria-label={`Remove ${preview.file.name}`}
                              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#A64A3B] text-white shadow transition-all duration-200 hover:scale-110 hover:bg-[#82362D] active:scale-95"
                            >
                              <X size={15} />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {photoError && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#FFF3F0] p-3 text-xs text-[#A64A3B]">
                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                      <span>{photoError}</span>
                    </div>
                  )}
                </div>

                {/* Form errors */}

                {(formError || error) && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#FFF3F0] p-3 text-xs text-[#A64A3B] sm:text-sm">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <span>{formError || error}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#EDF6EE] p-3 text-xs text-[#27613D] sm:text-sm">
                    <CheckCircle2 size={17} />
                    {successMessage}
                  </div>
                )}

                {/* Submit */}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#174B35] px-5 py-2.5 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#103A29] hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:py-3 sm:text-sm"
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        {isEditing ? "Update review" : "Submit review"}
                      </>
                    )}
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={submitting}
                      className="rounded-full px-4 py-2.5 text-xs font-semibold text-[#718078] transition-all duration-200 hover:bg-[#F3F5F3] active:scale-95 disabled:opacity-50 sm:px-5 sm:py-3 sm:text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews list */}

        <div>
          <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
            <h3 className="font-[var(--font-playfair)] text-lg font-semibold text-[#174B35] sm:text-xl sm:text-2xl">
              Visitor reviews
            </h3>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-[#E1E7E1] px-3 py-2 text-[11px] font-semibold text-[#52645A] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#174B35] hover:text-[#174B35] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {error && !formError && (
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#F0D9D4] bg-[#FFF7F5] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-xs text-[#A64A3B] sm:text-sm">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#A64A3B] px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8F3B30] active:translate-y-0 disabled:opacity-50"
              >
                <RefreshCw size={13} />
                Try again
              </button>
            </div>
          )}

          {loading && reviews.length === 0 ? (
            <div className="flex min-h-36 items-center justify-center rounded-xl border border-[#E8ECE8] bg-[#FAFBF9] sm:rounded-2xl">
              <div className="flex items-center gap-3 text-xs text-[#718078] sm:text-sm">
                <LoaderCircle size={19} className="animate-spin" />
                Loading visitor reviews...
              </div>
            </div>
          ) : error && reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DCE4DC] bg-[#FAFBF9] px-5 py-8 text-center sm:rounded-2xl sm:py-10">
              <MessageSquareText size={25} className="mx-auto text-[#87938B]" />

              <h4 className="mt-3 text-sm font-semibold text-[#174B35] sm:text-base">
                Reviews are temporarily unavailable
              </h4>

              <p className="mt-2 text-xs text-[#87938B] sm:text-sm">
                We couldn't retrieve visitor reviews right now. Please try
                again.
              </p>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#174B35] px-5 py-2.5 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#103A29] active:translate-y-0 disabled:opacity-50 sm:text-sm"
              >
                <RefreshCw size={14} />
                Retry loading
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DCE4DC] bg-[#FAFBF9] px-5 py-10 text-center sm:rounded-2xl sm:py-12">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#EDF3EE] text-[#174B35] sm:h-12 sm:w-12">
                <MessageSquareText size={22} />
              </div>

              <h4 className="mt-4 font-[var(--font-playfair)] text-base font-semibold text-[#174B35] sm:text-lg">
                No reviews yet
              </h4>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-[#87938B] sm:text-sm">
                Be the first visitor to share an experience at this destination.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {previewReviews.map((review, index) => {
                const reviewerName = getReviewerName(review);
                const reviewDate = formatReviewDate(review.createdAt);

                const ownReview = isOwner(review);
                const reviewId = review._id || review.id;

                const isConfirmingDelete = confirmDeleteId === String(reviewId);

                return (
                  <motion.article
                    key={reviewId}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                    whileInView={
                      shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
                    }
                    viewport={{
                      once: true,
                      amount: 0.15,
                    }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.55,
                      ease: [0.22, 1, 0.36, 1],
                      delay: shouldReduceMotion
                        ? 0
                        : Math.min(index * 0.12, 0.36),
                    }}
                    whileHover={shouldReduceMotion ? undefined : { y: -3 }}
                    className="group relative rounded-xl border border-[#E8ECE8] bg-white p-4 shadow-[0_4px_18px_rgba(23,75,53,0.035)] transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(23,75,53,0.09)] sm:rounded-2xl sm:p-5"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF1EB] text-sm font-semibold text-[#174B35] transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11">
                        {review.user?.photo ? (
                          <OptimizedImage
                            src={review.user.photo}
                            alt={reviewerName}
                            width={44}
                            height={44}
                            sizes="44px"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getReviewerInitial(review)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-[var(--font-inter)] text-xs font-semibold text-[#263D30] sm:text-sm">
                                {reviewerName}
                              </h4>

                              {ownReview && (
                                <span className="rounded-full bg-[#EDF3EE] px-2 py-0.5 text-[9px] font-semibold text-[#174B35] sm:text-[10px]">
                                  Your review
                                </span>
                              )}
                            </div>

                            {reviewDate && (
                              <p className="mt-1 font-[var(--font-inter)] text-[10px] text-[#929D94] sm:text-xs">
                                {reviewDate}
                              </p>
                            )}
                          </div>

                          <RatingStars
                            value={Number(review.rating) || 0}
                            size={13}
                          />
                        </div>

                        <p className="mt-3 whitespace-pre-line break-words font-[var(--font-inter)] text-xs leading-6 text-[#65746A] sm:mt-4 sm:text-sm sm:leading-7">
                          {review.review}
                        </p>

                        <ReviewPhotoGallery
                          photos={getReviewPhotos(review)}
                          shouldReduceMotion={shouldReduceMotion}
                        />

                        {ownReview && (
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={beginEditing}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#174B35] transition-all duration-200 hover:-translate-y-0.5 hover:text-[#A47A17] active:translate-y-0 sm:text-xs"
                            >
                              <Pencil size={13} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeleteId(
                                  isConfirmingDelete ? null : String(reviewId),
                                )
                              }
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#A64A3B] transition-all duration-200 hover:-translate-y-0.5 hover:text-[#82362D] active:translate-y-0 sm:text-xs"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        )}

                        <AnimatePresence initial={false}>
                          {ownReview && isConfirmingDelete && (
                            <motion.div
                              initial={
                                shouldReduceMotion
                                  ? false
                                  : { opacity: 0, y: 6 }
                              }
                              animate={{ opacity: 1, y: 0 }}
                              exit={
                                shouldReduceMotion
                                  ? undefined
                                  : { opacity: 0, y: 6 }
                              }
                              transition={{ duration: 0.2 }}
                              className="mt-4 rounded-xl border border-[#E8D9D5] bg-[#FFF9F7] p-3 sm:p-4"
                            >
                              <p className="text-xs font-medium text-[#38483E] sm:text-sm">
                                Delete this review? This action cannot be
                                undone.
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(reviewId)}
                                  disabled={submitting}
                                  className="inline-flex items-center gap-2 rounded-full bg-[#A64A3B] px-4 py-2 text-[11px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#8F3B30] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                                >
                                  {submitting ? (
                                    <>
                                      <LoaderCircle
                                        size={13}
                                        className="animate-spin"
                                      />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Yes, delete"
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  disabled={submitting}
                                  className="rounded-full border border-[#E8ECE8] px-4 py-2 text-[11px] font-semibold text-[#52645A] transition-colors duration-200 hover:bg-white disabled:opacity-50 sm:text-xs"
                                >
                                  Cancel
                                </button>
                              </div>

                              {formError && (
                                <p className="mt-3 text-xs text-[#A64A3B]">
                                  {formError}
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}

          {/* Link to the complete reviews page */}

          {totalReviews > 0 && reviewsPageUrl && (
            <div className="mt-6 flex justify-center sm:mt-7">
              <Link
                href={reviewsPageUrl}
                className="group inline-flex min-h-10 w-full items-center justify-center gap-3 rounded-xl bg-[#174B35] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_8px_22px_rgba(23,75,53,0.12)] transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-[#103A29] hover:shadow-[0_16px_32px_rgba(23,75,53,0.20)] active:translate-y-0 sm:min-h-12 sm:w-auto sm:min-w-[240px] sm:px-6 sm:py-3 sm:text-sm"
              >
                See all reviews
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
