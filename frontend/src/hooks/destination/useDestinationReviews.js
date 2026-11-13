"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

// Get a destination ID from either an object or string.
function getDestinationId(destination) {
  if (!destination) return "";

  if (typeof destination === "string") {
    return destination;
  }

  return String(destination._id || destination.id || "");
}

// Normalize review collection responses.
function normalizeReviews(response) {
  if (Array.isArray(response?.data?.reviews)) {
    return response.data.reviews;
  }

  if (Array.isArray(response?.reviews)) {
    return response.reviews;
  }

  return [];
}

// Normalize a single review response.
function normalizeReview(response) {
  return response?.data?.review || response?.review || null;
}

// Get the user ID associated with a review.
function getReviewUserId(review) {
  const user = review?.user;

  if (typeof user === "string") {
    return user;
  }

  return String(user?._id || user?.id || "");
}

// Get a review ID.
function getReviewId(review) {
  return String(review?._id || review?.id || "");
}

// Get a readable error message.
function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

// Accept browser File objects only.
function normalizePhotos(photos) {
  if (!Array.isArray(photos) || typeof File === "undefined") {
    return [];
  }

  return photos.filter((photo) => photo instanceof File);
}

// Build multipart data for review creation and updates.
function buildReviewFormData({
  review,
  rating,
  destination,
  photos = [],
  removePhotoPublicIds = [],
}) {
  const formData = new FormData();

  if (review !== undefined) {
    formData.append("review", String(review || "").trim());
  }

  if (rating !== undefined) {
    formData.append("rating", String(Number(rating)));
  }

  if (destination) {
    formData.append("destination", String(destination));
  }

  normalizePhotos(photos).forEach((photo) => {
    formData.append("photos", photo);
  });

  if (removePhotoPublicIds.length > 0) {
    formData.append(
      "removePhotoPublicIds",
      JSON.stringify(removePhotoPublicIds),
    );
  }

  return formData;
}

// Build rating statistics from local review records.
function calculateLocalRatingStats(reviews = []) {
  const totalReviews = reviews.length;

  const totalRating = reviews.reduce(
    (sum, item) => sum + Number(item.rating || 0),
    0,
  );

  const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

  const breakdown = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter(
      (item) => Number(item.rating) === rating,
    ).length;

    return {
      rating,
      count,
      percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
    };
  });

  const ratingBreakdown = Object.fromEntries(
    breakdown.map((item) => [item.rating, item.count]),
  );

  return {
    averageRating,
    totalReviews,
    breakdown,
    ratingBreakdown,
  };
}

// Normalize statistics returned by the backend.
function normalizeRatingStats(statistics) {
  if (!statistics) return null;

  const ratingBreakdown = {
    1: Number(statistics.ratingBreakdown?.[1] || 0),
    2: Number(statistics.ratingBreakdown?.[2] || 0),
    3: Number(statistics.ratingBreakdown?.[3] || 0),
    4: Number(statistics.ratingBreakdown?.[4] || 0),
    5: Number(statistics.ratingBreakdown?.[5] || 0),
  };

  const totalReviews = Number(statistics.totalReviews || 0);

  const breakdown = [5, 4, 3, 2, 1].map((rating) => {
    const count = ratingBreakdown[rating];

    return {
      rating,
      count,
      percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
    };
  });

  return {
    averageRating: Number(statistics.averageRating || 0),
    totalReviews,
    ratingBreakdown,
    breakdown,
  };
}

export default function useDestinationReviews(
  destination = null,
  options = {},
) {
  const destinationId = getDestinationId(destination);

  // Full reviews page options.
  // When these are omitted, the hook preserves the original
  // unpaginated destination-detail behaviour.
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || null;
  const rating = options.rating || "";
  const sort = options.sort || "";

  const paginationEnabled =
    limit !== null ||
    Boolean(rating) ||
    Boolean(sort) ||
    options.pagination === true;

  // Read authentication directly from the application provider.
  // Public review loading must not initialize the favourites store.
  const { user, authStatus } = useAuth();
  const isAuthenticated = authStatus === "authenticated";

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [serverStatistics, setServerStatistics] = useState(null);
  const [pagination, setPagination] = useState(null);

  const [requestVersion, setRequestVersion] = useState(0);

  // Build the reviews API query.
  const buildReviewsQuery = useCallback(() => {
    const query = new URLSearchParams({
      destination: destinationId,
    });

    if (paginationEnabled) {
      query.set("page", String(Math.max(1, page)));
      query.set("limit", String(Math.min(Math.max(limit || 10, 1), 50)));
    }

    if (rating) {
      query.set("rating", String(rating));
    }

    if (sort) {
      query.set("sort", sort);
    }

    return query;
  }, [destinationId, paginationEnabled, page, limit, rating, sort]);

  // Apply a successful collection response.
  const applyReviewsResponse = useCallback((response) => {
    const fetchedReviews = normalizeReviews(response);

    setReviews(fetchedReviews);

    setServerStatistics(normalizeRatingStats(response?.data?.statistics));

    setPagination(response?.data?.pagination || null);

    return fetchedReviews;
  }, []);

  // Fetch reviews for the current destination.
  const fetchReviews = useCallback(async () => {
    if (!destinationId) {
      setReviews([]);
      setServerStatistics(null);
      setPagination(null);
      setError("");
      setLoading(false);

      return [];
    }

    setLoading(true);
    setError("");

    try {
      const query = buildReviewsQuery();

      const response = await apiRequest(`reviews?${query.toString()}`);

      return applyReviewsResponse(response);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load reviews. Please try again."),
      );

      throw err;
    } finally {
      setLoading(false);
    }
  }, [destinationId, buildReviewsQuery, applyReviewsResponse]);

  // Automatically fetch reviews when destination or filters change.
  useEffect(() => {
    let active = true;

    if (!destinationId) {
      setReviews([]);
      setServerStatistics(null);
      setPagination(null);
      setError("");
      setLoading(false);

      return undefined;
    }

    async function loadReviews() {
      setLoading(true);
      setError("");

      try {
        const query = buildReviewsQuery();

        const response = await apiRequest(`reviews?${query.toString()}`);

        if (!active) return;

        applyReviewsResponse(response);
      } catch (err) {
        if (!active) return;

        setError(
          getErrorMessage(err, "Unable to load reviews. Please try again."),
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      active = false;
    };
  }, [destinationId, requestVersion, buildReviewsQuery, applyReviewsResponse]);

  // Refresh reviews manually.
  const refreshReviews = useCallback(async () => {
    try {
      return await fetchReviews();
    } catch {
      return [];
    }
  }, [fetchReviews]);

  // Create a new review.
  const createReview = useCallback(
    async ({
      review,
      rating,
      photos = [],
      destination: submittedDestination,
    }) => {
      const targetDestination =
        getDestinationId(submittedDestination) || destinationId;

      if (!targetDestination) {
        throw new Error("A valid destination is required.");
      }

      if (!isAuthenticated) {
        throw new Error("Please log in to submit a review.");
      }

      if (submitting) return null;

      const trimmedReview = String(review || "").trim();
      const numericRating = Number(rating);

      if (trimmedReview.length < 3 || trimmedReview.length > 2000) {
        throw new Error(
          "Your review must contain between 3 and 2000 characters.",
        );
      }

      if (
        !Number.isInteger(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        throw new Error("Please select a rating between 1 and 5.");
      }

      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      try {
        const body = buildReviewFormData({
          review: trimmedReview,
          rating: numericRating,
          destination: targetDestination,
          photos,
        });

        const response = await apiRequest("reviews", {
          method: "POST",
          body,
        });

        const createdReview = normalizeReview(response);

        if (!createdReview) {
          throw new Error("The review could not be confirmed.");
        }

        setReviews((current) => [
          createdReview,
          ...current.filter(
            (item) => getReviewId(item) !== getReviewId(createdReview),
          ),
        ]);

        setServerStatistics(null);

        setSuccessMessage("Your review has been submitted.");

        return createdReview;
      } catch (err) {
        setError(getErrorMessage(err, "Unable to submit your review."));

        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [destinationId, isAuthenticated, submitting],
  );

  // Update an existing review.
  const updateReview = useCallback(
    async (reviewId, updates = {}) => {
      if (!reviewId) {
        throw new Error("A valid review ID is required.");
      }

      if (!isAuthenticated) {
        throw new Error("Please log in to edit your review.");
      }

      if (submitting) return null;

      const existingReview = reviews.find(
        (item) => getReviewId(item) === String(reviewId),
      );

      if (!existingReview) {
        throw new Error("Review not found.");
      }

      const currentUserId = String(user?._id || user?.id || "");

      if (!currentUserId || getReviewUserId(existingReview) !== currentUserId) {
        throw new Error("You can only edit your own review.");
      }

      const trimmedReview = String(updates.review || "").trim();
      const numericRating = Number(updates.rating);

      if (trimmedReview.length < 3 || trimmedReview.length > 2000) {
        throw new Error(
          "Your review must contain between 3 and 2000 characters.",
        );
      }

      if (
        !Number.isInteger(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        throw new Error("Please select a rating between 1 and 5.");
      }

      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      try {
        const body = buildReviewFormData({
          review: trimmedReview,
          rating: numericRating,
          photos: updates.photos || [],
          removePhotoPublicIds: updates.removePhotoPublicIds || [],
        });

        const response = await apiRequest(
          `reviews/${encodeURIComponent(reviewId)}`,
          {
            method: "PATCH",
            body,
          },
        );

        const updatedReview = normalizeReview(response);

        if (!updatedReview) {
          throw new Error("The updated review could not be confirmed.");
        }

        setReviews((current) =>
          current.map((item) =>
            getReviewId(item) === String(reviewId) ? updatedReview : item,
          ),
        );

        setServerStatistics(null);

        setSuccessMessage("Your review has been updated.");

        return updatedReview;
      } catch (err) {
        setError(getErrorMessage(err, "Unable to update your review."));

        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [isAuthenticated, reviews, submitting, user],
  );

  // Delete an existing review.
  const deleteReview = useCallback(
    async (reviewId) => {
      if (!reviewId) {
        throw new Error("A valid review ID is required.");
      }

      if (!isAuthenticated) {
        throw new Error("Please log in to delete your review.");
      }

      if (submitting) return false;

      const existingReview = reviews.find(
        (item) => getReviewId(item) === String(reviewId),
      );

      if (!existingReview) {
        throw new Error("Review not found.");
      }

      const currentUserId = String(user?._id || user?.id || "");

      if (!currentUserId || getReviewUserId(existingReview) !== currentUserId) {
        throw new Error("You can only delete your own review.");
      }

      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      try {
        await apiRequest(`reviews/${encodeURIComponent(reviewId)}`, {
          method: "DELETE",
        });

        setReviews((current) =>
          current.filter((item) => getReviewId(item) !== String(reviewId)),
        );

        setServerStatistics(null);

        setSuccessMessage("Your review has been deleted.");

        return true;
      } catch (err) {
        setError(getErrorMessage(err, "Unable to delete your review."));

        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [isAuthenticated, reviews, submitting, user],
  );

  // Prefer complete backend statistics when available.
  // Local statistics remain the fallback for compatibility.
  const ratingStats = useMemo(() => {
    return serverStatistics || calculateLocalRatingStats(reviews);
  }, [serverStatistics, reviews]);

  // Find the authenticated visitor's review.
  const currentUserReview = useMemo(() => {
    if (!isAuthenticated || !user) return null;

    const currentUserId = String(user._id || user.id || "");

    if (!currentUserId) return null;

    return (
      reviews.find((item) => getReviewUserId(item) === currentUserId) || null
    );
  }, [reviews, isAuthenticated, user]);

  const clearMessages = useCallback(() => {
    setError("");
    setSuccessMessage("");
  }, []);

  const requestRefresh = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  return {
    reviews,

    loading,
    submitting,

    error,
    successMessage,
    clearMessages,

    isAuthenticated,
    authStatus,
    user,

    ratingStats,
    averageRating: ratingStats.averageRating,
    totalReviews: ratingStats.totalReviews,
    ratingBreakdown: ratingStats.ratingBreakdown,

    currentUserReview,
    hasReviewed: Boolean(currentUserReview),

    pagination,

    fetchReviews,
    refreshReviews,

    createReview,
    updateReview,
    deleteReview,

    setReviews,
    requestRefresh,
  };
}
