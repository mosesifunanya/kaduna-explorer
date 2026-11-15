"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

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

export default function SignupPage() {
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

  const { setAuthenticatedUser } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // Shared post-authentication process.
  async function completeSignup(user) {
    if (!user) {
      throw new Error("Unable to retrieve your account information.");
    }

    // The signup response now includes the complete profile fields
    // needed by the shared authentication provider.
    setAuthenticatedUser(user);

    const authenticatedUser = user;

    const searchParams = new URLSearchParams(window.location.search);

    const pendingDestinationId = searchParams.get("favorite");
    const requestedReturnTo = searchParams.get("returnTo");

    // Preserve pending destination favourite action.
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
          const errorMessage = String(
            favoriteError?.message || "",
          ).toLowerCase();

          const alreadySaved =
            errorMessage.includes("already") ||
            errorMessage.includes("duplicate") ||
            errorMessage.includes("exists") ||
            errorMessage.includes("409");

          if (!alreadySaved) {
            favoriteSaveFailed = true;
          }
        }
      } else {
        favoriteSaveFailed = true;
      }
    }

    // Refresh the shared favourites store after authentication.
    await notifyFavoriteAuthChanged(authenticatedUser);

    let destination = getSafeReturnTo(requestedReturnTo, "/");

    if (favoriteSaveFailed) {
      const separator = destination.includes("?") ? "&" : "?";

      destination = `${destination}${separator}favoriteSave=failed`;
    }

    router.replace(destination);
    router.refresh();
  }

  // Email and password registration.
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (form.password !== form.passwordConfirm) {
      setError("Your passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("users/signup", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          passwordConfirm: form.passwordConfirm,
        },
      });

      if (
        !data ||
        data.status === "fail" ||
        data.status === "error" ||
        !data.data?.user
      ) {
        throw new Error(data?.message || "Unable to create your account.");
      }

      await completeSignup(data.data.user);
    } catch (err) {
      setError(err?.message || "Unable to create your account.");
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
    setMessage("");
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
        throw new Error(data?.message || "Google authentication failed.");
      }

      await completeSignup(data.data.user);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to create your account with Google. Please try again.",
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

  const labelClass =
    "mb-1 sm:mb-1.5 block text-[12px] sm:text-sm font-bold text-[#183451]";

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
        title="Create your account"
        description="Join Kaduna Explorer and discover Kaduna your way."
        footer={
          <>
            Already have an account?{" "}
            <Link
              href={
                typeof window !== "undefined" && window.location.search
                  ? `/login${window.location.search}`
                  : "/login"
              }
              className="font-bold text-[#087747] underline-offset-4 transition hover:text-[#103C2A] hover:underline"
            >
              Sign in
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

        {message && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-5 text-green-800"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-0">
          <div>
            <label htmlFor="signup-name" className={labelClass}>
              Full name
            </label>

            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              disabled={loading}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="signup-email" className={labelClass}>
              Email address
            </label>

            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              disabled={loading}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="signup-password" className={labelClass}>
              Password
            </label>

            <div className="relative">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create a password"
                minLength={8}
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
                  <EyeOff size={19} aria-hidden="true" />
                ) : (
                  <Eye size={19} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="signup-confirm" className={labelClass}>
              Confirm password
            </label>

            <input
              id="signup-confirm"
              name="passwordConfirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="Enter your password again"
              minLength={8}
              required
              disabled={loading}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-[42px] sm:h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFBD4A] px-5 text-base font-extrabold text-[#103C2A] shadow-[0_5px_14px_rgba(210,151,25,0.18)] transition hover:-translate-y-0.5 hover:bg-[#FFD16D] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087747] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-[#103C2A]/30 border-t-[#103C2A]"
                />
                Creating account...
              </>
            ) : (
              <>
                Create account
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-[#E3E8E3]" />

            <span className="text-[11px] font-medium text-[#718096]">
              or continue with
            </span>

            <span className="h-px flex-1 bg-[#E3E8E3]" />
          </div>

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
