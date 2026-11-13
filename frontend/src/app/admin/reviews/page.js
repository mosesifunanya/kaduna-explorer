"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Flag,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  UserRound,
  X,
  CalendarDays,
  MapPin,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

function getReviews(response) {
  const candidates = [
    response?.data?.reviews,
    response?.reviews,
    response?.data?.data?.reviews,
    response?.data,
  ];

  return candidates.find(Array.isArray) || [];
}

function getReviewId(review) {
  const id = review?._id || review?.id;
  return id ? String(id) : "";
}

function getReviewerName(review) {
  if (typeof review?.user === "string") return "Registered user";

  return (
    review?.user?.name ||
    review?.user?.fullName ||
    review?.name ||
    "Registered user"
  );
}

function getDestinationName(review) {
  if (typeof review?.destination === "string") {
    return "Destination";
  }

  return (
    review?.destination?.name ||
    review?.destinationName ||
    review?.tour?.name ||
    "Destination"
  );
}

function getReviewText(review) {
  return review?.review || review?.comment || review?.title || "";
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getRating(review) {
  const rating = Number(review?.rating);
  return Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0;
}

function Rating({ value, size = 15 }) {
  const rating = getRating({ rating: value });

  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= rating ? "fill-[#F5AE22] text-[#F5AE22]" : "text-slate-200"
          }
        />
      ))}
      <span className="ml-1 text-xs font-bold text-[#294638]">{rating}/5</span>
    </div>
  );
}

function StatCard({ label, value, description, icon: Icon, tone }) {
  const tones = {
    green: "bg-[#EAF4EC] text-[#176B48]",
    amber: "bg-[#FFF7E4] text-[#B96A00]",
    red: "bg-red-50 text-red-600",
    neutral: "bg-[#F0F4ED] text-[#294638]",
  };

  return (
    <div className="rounded-[22px] border border-[#E5EAE2] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#103C2A]">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            tones[tone] || tones.neutral
          }`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function Notice({ type = "error", children, onClose }) {
  const success = type === "success";

  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {success ? (
        <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={19} className="mt-0.5 shrink-0" />
      )}

      <p className="flex-1 leading-6">{children}</p>

      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss message"
        className="rounded-lg p-1 transition hover:bg-black/5"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ReviewStatus() {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
      Published
    </span>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const loadReviews = useCallback(async (isRefresh = false) => {
    setError("");
    setNotice("");

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await apiRequest("reviews");
      setReviews(getReviews(response));
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Unable to load reviews. Check your connection and review API.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const reportedCount = useMemo(
    () =>
      reviews.filter(
        (review) =>
          review?.reported === true ||
          review?.isReported === true ||
          Number(review?.reportsCount) > 0 ||
          Number(review?.reportCount) > 0,
      ).length,
    [reviews],
  );

  const averageRating = useMemo(() => {
    if (!reviews.length) return "0.0";

    const total = reviews.reduce((sum, review) => sum + getRating(review), 0);

    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const searchableText = [
        getReviewText(review),
        getReviewerName(review),
        getDestinationName(review),
        review?._id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(normalizedSearch);

      const rating = getRating(review);
      const matchesRating =
        ratingFilter === "all" || rating === Number(ratingFilter);

      const isReported =
        review?.reported === true ||
        review?.isReported === true ||
        Number(review?.reportsCount) > 0 ||
        Number(review?.reportCount) > 0;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "reported" && isReported) ||
        (statusFilter === "published" && !isReported);

      return matchesSearch && matchesRating && matchesStatus;
    });
  }, [reviews, search, ratingFilter, statusFilter]);

  const requestDelete = (review) => {
    setError("");
    setNotice("");
    setReviewToDelete(review);
  };

  const handleDeleteReview = async () => {
    const reviewId = getReviewId(reviewToDelete);

    if (!reviewId) {
      setError("This review has no valid ID and cannot be removed.");
      setReviewToDelete(null);
      return;
    }

    setDeletingId(reviewId);
    setError("");
    setNotice("");

    try {
      // Use the existing admin-only route, not the owner's delete route.
      await apiRequest(`reviews/admin/${encodeURIComponent(reviewId)}`, {
        method: "DELETE",
      });

      setReviews((previous) =>
        previous.filter((review) => getReviewId(review) !== reviewId),
      );

      setSelectedReview((previous) =>
        previous && getReviewId(previous) === reviewId ? null : previous,
      );

      setReviewToDelete(null);
      setNotice("Review removed successfully.");
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Unable to remove this review. Confirm that you are signed in as an administrator.",
      );
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DCE9D7] bg-[#EEF5EA] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#176B48]">
            <MessageSquareText size={13} />
            Community management
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-[#103C2A] sm:text-3xl">
            Reviews management
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Reviews are published automatically. Monitor visitor feedback and
            remove inappropriate or reported content when necessary.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadReviews(true)}
          disabled={loading || refreshing}
          className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-2xl border border-[#DDE5D9] bg-white px-4 py-3 text-sm font-bold text-[#294638] transition hover:bg-[#F7F9F5] disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh reviews"}
        </button>
      </div>

      {error && (
        <Notice type="error" onClose={() => setError("")}>
          {error}
        </Notice>
      )}

      {notice && (
        <Notice type="success" onClose={() => setNotice("")}>
          {notice}
        </Notice>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total reviews"
          value={loading ? "—" : reviews.length}
          description="Reviews available"
          icon={MessageSquare}
          tone="green"
        />

        <StatCard
          label="Published"
          value={loading ? "—" : reviews.length - reportedCount}
          description="Reviews not flagged as reported"
          icon={CheckCircle2}
          tone="green"
        />

        <StatCard
          label="Reported"
          value={loading ? "—" : reportedCount}
          description="Flagged for attention"
          icon={Flag}
          tone="red"
        />

        <StatCard
          label="Average rating"
          value={loading ? "—" : averageRating}
          description="Across rated reviews"
          icon={Star}
          tone="amber"
        />
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#E4E9E1] bg-white shadow-sm">
        <div className="border-b border-[#EDF0EA] p-5 sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#103C2A]">
                Visitor reviews
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search feedback and inspect individual reviews.
              </p>
              <p className="mt-4 text-xs font-medium text-slate-500">
                Showing {filteredReviews.length} of {reviews.length} reviews
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:w-[710px]">
              <label className="relative block sm:col-span-1">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reviews..."
                  className="h-12 w-full rounded-2xl border border-[#DFE6DC] bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#176B48] focus:ring-2 focus:ring-[#176B48]/10"
                />
              </label>

              <label className="relative block">
                <SlidersHorizontal
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71917B]"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-12 w-full appearance-none rounded-2xl border border-[#DFE6DC] bg-white pl-10 pr-3 text-sm font-semibold text-[#294638] outline-none focus:border-[#176B48]"
                >
                  <option value="all">All reviews</option>
                  <option value="published">Published</option>
                  <option value="reported">Reported</option>
                </select>
              </label>

              <label className="relative block">
                <Star
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71917B]"
                />
                <select
                  value={ratingFilter}
                  onChange={(event) => setRatingFilter(event.target.value)}
                  className="h-12 w-full appearance-none rounded-2xl border border-[#DFE6DC] bg-white pl-10 pr-3 text-sm font-semibold text-[#294638] outline-none focus:border-[#176B48]"
                >
                  <option value="all">All ratings</option>
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
            <LoaderCircle size={30} className="animate-spin text-[#176B48]" />
            <p className="text-sm font-semibold text-slate-500">
              Loading visitor reviews...
            </p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5EA] text-[#176B48]">
              <MessageSquareText size={25} />
            </div>
            <h3 className="mt-4 font-bold text-[#103C2A]">
              {reviews.length ? "No matching reviews" : "No reviews yet"}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {reviews.length
                ? "Try changing your search or filters."
                : "Visitor reviews will appear here when users submit feedback."}
            </p>

            {reviews.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setRatingFilter("all");
                  setStatusFilter("all");
                }}
                className="mt-4 rounded-xl px-4 py-2 text-sm font-bold text-[#176B48] hover:bg-[#EEF5EA]"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#EDF0EA] bg-[#FAFBF8] text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">Reviewer</th>
                    <th className="px-5 py-4">Destination</th>
                    <th className="px-5 py-4">Rating and feedback</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReviews.map((review) => {
                    const id = getReviewId(review);
                    const text = getReviewText(review);
                    const isReported =
                      review?.reported === true ||
                      review?.isReported === true ||
                      Number(review?.reportsCount) > 0 ||
                      Number(review?.reportCount) > 0;

                    return (
                      <tr
                        key={
                          id || `${getReviewerName(review)}-${review.createdAt}`
                        }
                        className="border-b border-[#F0F2ED] last:border-0 hover:bg-[#FCFDFB]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF5EA] text-[#176B48]">
                              <UserRound size={19} />
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-36 truncate text-xs font-extrabold text-[#183D2B]">
                                {getReviewerName(review)}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {review?.user?.email || "No email provided"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-start gap-2 text-xs font-bold text-[#294638]">
                            <MapPin
                              size={15}
                              className="mt-0.5 shrink-0 text-[#71917B]"
                            />
                            <span className="max-w-36">
                              {getDestinationName(review)}
                            </span>
                          </div>
                        </td>

                        <td className="max-w-[350px] px-5 py-5">
                          <Rating value={review.rating} />
                          <p className="mt-2 max-w-[330px] text-xs leading-5 text-slate-500">
                            {text
                              ? text.length > 125
                                ? `${text.slice(0, 125)}…`
                                : text
                              : "No written feedback"}
                          </p>
                          {isReported && (
                            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                              <Flag size={12} />
                              Reported
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-xs text-slate-500">
                          {formatDate(review.createdAt)}
                        </td>

                        <td className="px-5 py-5">
                          {isReported ? (
                            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700">
                              <Flag size={12} />
                              Reported
                            </span>
                          ) : (
                            <ReviewStatus />
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedReview(review)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE5D9] bg-white px-3 py-2.5 text-xs font-bold text-[#294638] transition hover:bg-[#F1F6EF]"
                            >
                              <Eye size={14} />
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() => requestDelete(review)}
                              disabled={!id || deletingId === id}
                              title="Remove review"
                              aria-label={`Remove review by ${getReviewerName(review)}`}
                              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white p-2.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === id ? (
                                <LoaderCircle
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 sm:p-5 lg:hidden">
              {filteredReviews.map((review) => {
                const id = getReviewId(review);
                const isReported =
                  review?.reported === true ||
                  review?.isReported === true ||
                  Number(review?.reportsCount) > 0 ||
                  Number(review?.reportCount) > 0;

                return (
                  <article
                    key={id || `${getReviewerName(review)}-${review.createdAt}`}
                    className="rounded-2xl border border-[#E6EBE2] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF5EA] text-[#176B48]">
                          <UserRound size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-[#103C2A]">
                            {getReviewerName(review)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                      </div>

                      {isReported ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">
                          Reported
                        </span>
                      ) : (
                        <ReviewStatus />
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-bold text-[#294638]">
                        {getDestinationName(review)}
                      </p>
                      <div className="mt-2">
                        <Rating value={review.rating} />
                      </div>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                        {getReviewText(review) || "No written feedback"}
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-[#EDF0EA] pt-3">
                      <button
                        type="button"
                        onClick={() => setSelectedReview(review)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#DDE5D9] px-3 py-2.5 text-xs font-bold text-[#294638] hover:bg-[#F1F6EF]"
                      >
                        <Eye size={15} />
                        View details
                      </button>

                      <button
                        type="button"
                        onClick={() => requestDelete(review)}
                        disabled={!id || deletingId === id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === id ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-[#EDF0EA] bg-[#FCFDFB] px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {loading
              ? "Loading reviews..."
              : `${filteredReviews.length} review${filteredReviews.length === 1 ? "" : "s"} displayed`}
          </span>
          <span>Review removal is restricted to administrators.</span>
        </div>
      </section>

      {selectedReview && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#10281C]/50 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedReview(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-details-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-[26px] bg-white p-5 shadow-2xl sm:rounded-[26px] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#EEF5EA] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#176B48]">
                  <MessageSquareText size={13} />
                  Review details
                </span>
                <h2
                  id="review-details-title"
                  className="mt-3 text-xl font-extrabold text-[#103C2A]"
                >
                  Visitor feedback
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                aria-label="Close review details"
                className="rounded-xl border border-[#E4E9E1] p-2 text-slate-500 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-[#F7F9F5] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E5F0E5] text-[#176B48]">
                  <UserRound size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#103C2A]">
                    {getReviewerName(selectedReview)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedReview?.user?.email || "No email provided"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Destination
                </p>
                <p className="flex items-center gap-2 text-sm font-semibold text-[#294638]">
                  <MapPin size={16} className="text-[#71917B]" />
                  {getDestinationName(selectedReview)}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Rating
                </p>
                <Rating value={selectedReview.rating} size={19} />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Review
                </p>
                <p className="whitespace-pre-wrap break-words rounded-2xl border border-[#E8ECE5] bg-white p-4 text-sm leading-7 text-slate-600">
                  {getReviewText(selectedReview) || "No written feedback"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Submitted
                </p>
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <CalendarDays size={16} className="text-[#71917B]" />
                  {formatDate(selectedReview.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedReview(null);
                  requestDelete(selectedReview);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
                Remove review
              </button>

              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="rounded-xl bg-[#103C2A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#176B48]"
              >
                Close details
              </button>
            </div>
          </section>
        </div>
      )}

      {reviewToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#10281C]/55 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            className="w-full max-w-md rounded-[26px] bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={23} />
            </div>

            <h2
              id="confirm-delete-title"
              className="mt-5 text-xl font-extrabold text-[#103C2A]"
            >
              Remove this review?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              You are about to permanently remove the review by{" "}
              <span className="font-bold text-[#294638]">
                {getReviewerName(reviewToDelete)}
              </span>{" "}
              for{" "}
              <span className="font-bold text-[#294638]">
                {getDestinationName(reviewToDelete)}
              </span>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                disabled={Boolean(deletingId)}
                className="rounded-xl border border-[#DFE6DC] px-4 py-3 text-sm font-bold text-[#294638] hover:bg-[#F7F9F5] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteReview}
                disabled={Boolean(deletingId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Remove review
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
