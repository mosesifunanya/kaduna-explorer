"use client";

import Link from "next/link";
import Script from "next/script";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Eye, EyeOff, Mail } from "lucide-react";

import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { notifyFavoriteAuthChanged } from "@/hooks/destination/useDestinationFavorite";

function getSafeReturnTo(value, fallback = "/") {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin) {
      return fallback;
    }

    if (url.pathname === "/login" || url.pathname === "/signup") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef(null);
  const googleInitTimerRef = useRef(null);
  const googleInitAttemptsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (googleInitTimerRef.current) {
        window.clearTimeout(googleInitTimerRef.current);
      }
    };
  }, []);

  // Use the existing global authentication provider.
  const { setAuthenticatedUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Shared post-authentication flow for email and Google login.
  async function completeLogin(user) {
    if (!user) {
      throw new Error("Unable to retrieve your account information.");
    }

    // The login response now includes the complete profile fields
    // needed by the shared authentication provider.
    setAuthenticatedUser(user);

    const authenticatedUser = user;

    const searchParams = new URLSearchParams(window.location.search);

    const pendingDestinationId = searchParams.get("favorite");
    const requestedReturnTo = searchParams.get("returnTo");

    // Administrators go to the admin dashboard.
    if (authenticatedUser.role === "admin") {
      router.replace("/admin");
      router.refresh();
      return;
    }

    // Preserve pending favourite action.
    let favoriteSaveFailed = false;

    if (pendingDestinationId) {
      const isValidDestinationId = /^[a-f\d]{24}$/i.test(pendingDestinationId);

      if (isValidDestinationId) {
        try {
          await apiRequest("favorites", {
            method: "POST",
            body: {
              destination: pendingDestinationId,
            },
          });
        } catch (favoriteError) {
          const message = String(favoriteError?.message || "").toLowerCase();

          const alreadySaved =
            message.includes("already") ||
            message.includes("duplicate") ||
            message.includes("exists") ||
            message.includes("409");

          if (!alreadySaved) {
            favoriteSaveFailed = true;
          }
        }
      } else {
        favoriteSaveFailed = true;
      }
    }

    // Synchronize authentication and favourites.
    await notifyFavoriteAuthChanged(authenticatedUser);

    // Default regular users to the public homepage.
    let destination = getSafeReturnTo(requestedReturnTo, "/");

    if (favoriteSaveFailed) {
      const separator = destination.includes("?") ? "&" : "?";
      destination = `${destination}${separator}favoriteSave=failed`;
    }

    router.replace(destination);
    router.refresh();
  }

  // Email and password login.
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("users/login", {
        method: "POST",
        body: {
          email: email.trim(),
          password,
        },
      });

      if (
        !data ||
        data.status === "fail" ||
        data.status === "error" ||
        !data.data?.user
      ) {
        throw new Error(data?.message || "Unable to sign in.");
      }

      await completeLogin(data.data.user);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to sign in. Please check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Google credential callback.
  async function handleGoogleCredential(response) {
    if (!response?.credential) {
      setError("Google authentication did not return a valid credential.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("users/google", {
        method: "POST",
        body: {
          credential: response.credential,
        },
      });

      if (
        !data ||
        data.status === "fail" ||
        data.status === "error" ||
        !data.data?.user
      ) {
        throw new Error(data?.message || "Google sign-in failed.");
      }

      await completeLogin(data.data.user);
    } catch (err) {
      setError(
        err?.message || "Unable to sign in with Google. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Initialize Google's official sign-in button after the SDK and
  // its container are both ready. Retry briefly instead of requiring refresh.
  function initializeGoogle() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const buttonContainer = googleButtonRef.current;

    if (!clientId) {
      setError("Google sign-in is not configured. Please try again later.");
      return;
    }

    if (
      !window.google?.accounts?.id ||
      !buttonContainer ||
      buttonContainer.getBoundingClientRect().width === 0
    ) {
      if (googleInitAttemptsRef.current < 20) {
        googleInitAttemptsRef.current += 1;
        googleInitTimerRef.current = window.setTimeout(initializeGoogle, 150);
        return;
      }

      setError("Google sign-in could not be loaded. Please try again.");
      googleInitAttemptsRef.current = 0;
      return;
    }

    if (googleInitTimerRef.current) {
      window.clearTimeout(googleInitTimerRef.current);
      googleInitTimerRef.current = null;
    }
    googleInitAttemptsRef.current = 0;

    buttonContainer.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
    });

    window.google.accounts.id.renderButton(buttonContainer, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "center",
      width: Math.floor(buttonContainer.getBoundingClientRect().width),
    });
  }

  const inputClass =
    "h-[40px] sm:h-[46px] w-full rounded-xl border border-[#D7E0E9] bg-white/90 px-4 text-sm text-[#183451] outline-none transition placeholder:text-[#91A0B3] hover:border-[#B7C7D6] focus:border-[#087747] focus:ring-4 focus:ring-[#087747]/10 disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={initializeGoogle}
        onError={() =>
          setError("Unable to load Google sign-in. Please try again.")
        }
      />

      <AuthLayout
        title="Welcome back"
        description="Sign in to continue your journey in Kaduna Explorer."
        footer={
          <>
            New to Kaduna Explorer?{" "}
            <Link
              href={
                typeof window !== "undefined" && window.location.search
                  ? `/signup${window.location.search}`
                  : "/signup"
              }
              className="font-bold text-[#087747] underline-offset-4 transition hover:text-[#103C2A] hover:underline"
            >
              Create an account
            </Link>
          </>
        }
      >
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3.5">
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 sm:mb-1.5 block text-[12px] sm:text-sm font-bold text-[#183451]"
            >
              Email address
            </label>

            <div className="relative">
              <Mail
                size={19}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#24496E]"
              />

              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                className={`${inputClass} pl-12`}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              className="mb-1 sm:mb-1.5 block text-[12px] sm:text-sm font-bold text-[#183451]"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                className={`${inputClass} pr-12`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={loading}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-[#536B87] transition hover:text-[#087747] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#087747] disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me and forgot password */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <label className="flex cursor-pointer items-center gap-2 text-[#536B87]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded accent-[#087747]"
              />
              Remember me
            </label>

            <Link
              href="/forgot-password"
              className="font-semibold text-[#087747] transition hover:text-[#103C2A] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading}
            className="flex h-[42px] sm:h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFBD4A] px-5 text-base font-extrabold text-[#103C2A] shadow-[0_5px_14px_rgba(210,151,25,0.18)] transition hover:-translate-y-0.5 hover:bg-[#FFD16D] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087747] focus-visible:ring-offset-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-[#103C2A]/30 border-t-[#103C2A]"
                />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>

          {/* Social login divider */}
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-[#E3E8E3]" />

            <span className="text-[11px] font-medium text-[#718096]">
              or continue with
            </span>

            <span className="h-px flex-1 bg-[#E3E8E3]" />
          </div>

          {/* Google sign-in button */}
          <div
            ref={googleButtonRef}
            className={`flex min-h-[46px] w-full justify-center overflow-hidden rounded-xl ${
              loading ? "pointer-events-none opacity-60" : ""
            }`}
          />
        </form>
      </AuthLayout>
    </>
  );
}
