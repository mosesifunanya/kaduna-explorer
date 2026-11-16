"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import {
  Bookmark,
  X,
  LockKeyhole,
  ArrowRight,
  LogIn,
  UserPlus,
  Check,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import useDestinationFavorite from "@/hooks/destination/useDestinationFavorite";

export default function DestinationFavorite({
  destination,
  variant = "default",
  showLabel = false,
  className = "",
}) {
  const {
    isAuthenticated,
    authStatus,
    isFavorite,
    isPending,
    isLoading,
    toggleFavorite,
  } = useDestinationFavorite(destination);

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);
  const [portalReady, setPortalReady] = useState(false);

  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const notificationTimerRef = useRef(null);

  const destinationName = destination?.name || "this destination";
  const destinationId = destination?._id || destination?.id;

  const isCompact = variant === "compact";
  const isOverview = variant === "overview";

  const isAuthenticationChecking = authStatus === "checking" || isLoading;

  const destinationImage =
    destination?.coverImage?.url ||
    destination?.coverImage ||
    destination?.images?.find((image) => image?.isCover)?.url ||
    destination?.images?.[0]?.url ||
    destination?.images?.[0] ||
    "";

  const getAuthenticationUrl = (route) => {
    if (!destinationId || typeof window === "undefined") {
      return route;
    }

    const returnTo = window.location.pathname + window.location.search;

    const params = new URLSearchParams({
      returnTo,
      favorite: String(destinationId),
    });

    return `${route}?${params.toString()}`;
  };

  const loginHref = getAuthenticationUrl("/login");
  const signupHref = getAuthenticationUrl("/signup");

  useEffect(() => {
    setPortalReady(true);
  }, []);

  function closePrompt() {
    setShowLoginPrompt(false);
  }

  function dismissNotification() {
    if (notificationTimerRef.current) {
      window.clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }

    setNotification(null);
  }

  function showSuccessNotification(wasFavorite) {
    if (notificationTimerRef.current) {
      window.clearTimeout(notificationTimerRef.current);
    }

    setNotification({
      type: wasFavorite ? "removed" : "saved",
      name: destinationName,
      image: destinationImage,
    });

    notificationTimerRef.current = window.setTimeout(() => {
      setNotification(null);
      notificationTimerRef.current = null;
    }, 4500);
  }

  async function handleFavoriteClick(event) {
    event.preventDefault();
    event.stopPropagation();

    setError("");

    if (!destinationId) {
      setError("This destination cannot be saved because its ID is missing.");
      return;
    }

    if (isAuthenticationChecking || isPending) {
      return;
    }

    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    const wasFavorite = isFavorite;
    const success = await toggleFavorite();

    if (!success) {
      setError("We couldn't update your saved destinations. Please try again.");
      return;
    }

    showSuccessNotification(wasFavorite);
  }

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        window.clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showLoginPrompt) return;

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closePrompt();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll(
        "a[href], button:not([disabled])",
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus?.();
    };
  }, [showLoginPrompt]);

  return (
    <>
      <div
        className={`
          relative inline-flex
          ${isOverview ? "flex-col items-start" : "flex-col items-center"}
          ${className}
        `}
      >
        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={isPending || isAuthenticationChecking}
          aria-label={
            isFavorite
              ? `Remove ${destinationName} from saved destinations`
              : `Save ${destinationName} to saved destinations`
          }
          aria-pressed={isFavorite}
          aria-busy={isPending || isAuthenticationChecking}
          title={
            isFavorite ? "Remove from saved destinations" : "Save destination"
          }
          className={
            isOverview
              ? `
                group/favorite inline-flex min-h-10
                items-center justify-center gap-2
                rounded-full border px-4 py-2
                font-[family-name:var(--font-inter)]
                text-[11px] font-semibold
                transition-all duration-200
                active:scale-[0.98]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#174B35]
                focus-visible:ring-offset-2
                disabled:cursor-wait disabled:opacity-60
                sm:min-h-11 sm:px-4 sm:text-xs
                ${
                  isFavorite
                    ? "border-[#BBD2BF] bg-[#EAF2E9] text-[#174B35] hover:bg-[#DFEBDD]"
                    : "border-[#E4D3A9] bg-white text-[#76530D] hover:border-[#D9A21B] hover:bg-[#FFF8E8]"
                }
              `
              : `
                group/favorite relative inline-flex shrink-0
                items-center justify-center overflow-hidden
                rounded-full border shadow-lg backdrop-blur-xl
                transition-all duration-300 ease-out
                hover:scale-105 active:scale-95
                focus-visible:outline-none focus-visible:ring-4
                focus-visible:ring-[#FFBD4A]/40
                disabled:cursor-wait disabled:opacity-70
                ${isCompact ? "h-9 w-9" : "h-11 w-11 sm:h-12 sm:w-12"}
                ${
                  isFavorite
                    ? "border-[#BBD2BF] bg-[#EAF2E9] text-[#174B35] hover:bg-[#DDEBDD]"
                    : "border-white/70 bg-white/95 text-[#244B38] hover:border-[#FFBD4A] hover:bg-[#FFF8E8] hover:text-[#174B35]"
                }
              `
          }
        >
          {isPending || isAuthenticationChecking ? (
            <LoaderCircle
              size={isOverview ? 15 : isCompact ? 17 : 20}
              className="shrink-0 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Bookmark
              size={isOverview ? 16 : isCompact ? 17 : 20}
              strokeWidth={2}
              fill={isFavorite ? "currentColor" : "none"}
              aria-hidden="true"
              className={`
                shrink-0 transition-all duration-300
                group-hover/favorite:scale-110
                ${isFavorite ? "animate-[favorite-pop_300ms_ease-out]" : ""}
              `}
            />
          )}

          {isOverview && (
            <span className="whitespace-nowrap">
              {isPending
                ? "Updating..."
                : isAuthenticationChecking
                  ? "Checking..."
                  : isFavorite
                    ? "Saved"
                    : "Save"}
            </span>
          )}
        </button>

        {showLabel && !isOverview && (
          <span className="mt-1.5 text-[10px] font-semibold text-[#526B5C]">
            {isFavorite ? "Saved" : "Save"}
          </span>
        )}

        {error && (
          <div
            role="alert"
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-red-100 bg-white p-3 text-xs leading-5 text-red-700 shadow-xl"
          >
            {error}
          </div>
        )}
      </div>

      {/* COMPACT SAVED DESTINATION NOTIFICATION */}
      {portalReady &&
        createPortal(
          <AnimatePresence>
            {notification && (
              <motion.div
                key={`${notification.type}-${notification.name}`}
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{
                  duration: 0.24,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="
                  pointer-events-none fixed inset-x-0
                  top-[76px] z-[9999]
                  flex justify-center px-3
                  sm:top-6 sm:px-4
                "
              >
                <div
                  role="status"
                  aria-live="polite"
                  className="
                    pointer-events-auto relative
                    flex w-full max-w-[330px] items-center
                    gap-2.5 rounded-[17px]
                    border border-[#E8EDE5]
                    bg-white px-3 py-3
                    shadow-[0_12px_35px_rgba(20,45,30,0.16)]
                    sm:max-w-[350px] sm:gap-3 sm:px-3.5
                  "
                >
                  <div
                    className="
                      h-[43px] w-[43px] shrink-0
                      overflow-hidden rounded-[11px]
                      bg-[#EAF2E9]
                    "
                  >
                    {notification.image ? (
                      <img
                        src={notification.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#174B35]">
                        <Bookmark size={19} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold leading-4 text-[#183B2A]">
                      {notification.type === "saved"
                        ? "Destination saved"
                        : "Destination removed"}
                    </p>

                    <p className="mt-1 line-clamp-2 text-[10px] leading-[14px] text-[#78877C]">
                      {notification.type === "saved"
                        ? `${notification.name} added to your saved places.`
                        : `${notification.name} removed from your saved places.`}
                    </p>
                  </div>

                  {notification.type === "saved" && (
                    <Link
                      href="/dashboard/saved"
                      onClick={dismissNotification}
                      className="
                        flex shrink-0 items-center gap-1
                        whitespace-nowrap text-[10px]
                        font-bold text-[#174B35]
                        transition-colors hover:text-[#A27A35]
                      "
                    >
                      View saved
                      <ArrowRight size={12} />
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={dismissNotification}
                    aria-label="Close notification"
                    className="
                      absolute -right-1.5 -top-1.5
                      flex h-6 w-6 items-center justify-center
                      rounded-full border border-[#E9EDE5]
                      bg-white text-[#879187]
                      shadow-sm transition
                      hover:bg-[#F1F4EF] hover:text-[#244B38]
                    "
                  >
                    <X size={13} />
                  </button>

                  <motion.div
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: 4.5, ease: "linear" }}
                    className="
                      absolute bottom-0 left-0 h-[2px] w-full
                      origin-left rounded-full bg-[#174B35]/70
                    "
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* SIGN-IN PROMPT */}
      {portalReady &&
        showLoginPrompt &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#071B12]/70 px-4 py-6 backdrop-blur-md"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closePrompt();
              }
            }}
          >
            <section
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="favorite-login-title"
              aria-describedby="favorite-login-description"
              className="relative my-auto w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.3)]"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-[#103C2A] via-[#18543A] to-[#285D43] px-6 pb-9 pt-8 text-center sm:px-9">
                <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border border-white/10" />

                <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full border border-white/10" />

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closePrompt}
                  aria-label="Close login prompt"
                  className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD4A]"
                >
                  <X size={18} />
                </button>

                <div className="relative mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-[25px] border border-white/20 bg-white/10 text-[#FFBD4A] shadow-inner">
                  <Bookmark size={36} strokeWidth={1.7} />
                </div>

                <p className="relative mt-5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#FFBD4A]">
                  Your personal collection
                </p>

                <h2
                  id="favorite-login-title"
                  className="relative mt-2 text-[25px] font-extrabold tracking-tight text-white sm:text-[29px]"
                >
                  Save destinations for later
                </h2>

                <p
                  id="favorite-login-description"
                  className="relative mx-auto mt-3 max-w-[300px] text-[13px] leading-6 text-white/75 sm:text-sm"
                >
                  Keep your saved destinations together and easily discover them
                  whenever you return to Kaduna Explorer.
                </p>
              </div>

              <div className="px-5 pb-7 pt-6 sm:px-8">
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#E7EDE7] bg-[#F6F9F5] p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F0E7] text-[#18543A]">
                    <LockKeyhole size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#173B2A]">
                      Sign in to continue
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#6A7B70]">
                      Create an account or sign in to save{" "}
                      <span className="font-semibold text-[#315A43]">
                        {destinationName}
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <Link
                  href={loginHref}
                  onClick={closePrompt}
                  className="group flex min-h-[51px] w-full items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-5 text-sm font-bold text-white shadow-lg shadow-[#103C2A]/15 transition hover:bg-[#18543A] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD4A] focus-visible:ring-offset-2"
                >
                  <LogIn size={17} />
                  Sign in to your account
                  <ArrowRight
                    size={16}
                    className="ml-auto transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  href={signupHref}
                  onClick={closePrompt}
                  className="mt-3 flex min-h-[49px] w-full items-center justify-center gap-2 rounded-xl border border-[#DCE7DC] bg-white px-5 text-sm font-bold text-[#244B38] transition hover:border-[#B8CEBA] hover:bg-[#F6F9F5] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087747] focus-visible:ring-offset-2"
                >
                  <UserPlus size={17} />
                  Create an account
                </Link>

                <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#89958C]">
                  <ShieldCheck size={14} />
                  Your saved places stay linked to your account
                </div>

                <button
                  type="button"
                  onClick={closePrompt}
                  className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-[#89958C] transition hover:text-[#244B38]"
                >
                  <Check size={14} />
                  Maybe later
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
