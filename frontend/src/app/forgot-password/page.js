"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { apiRequest } from "@/lib/api";

const inputClass =
  "h-[40px] sm:h-[46px] w-full rounded-xl border border-[#D7E0E9] bg-white/90 px-4 text-sm text-[#183451] outline-none transition placeholder:text-[#91A0B3] hover:border-[#B7C7D6] focus:border-[#087747] focus:ring-4 focus:ring-[#087747]/10 disabled:cursor-not-allowed disabled:opacity-70";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiRequest("users/forgotPassword", {
        method: "POST",
        body: { email: email.trim() },
      });

      setSubmitted(true);
      if (response?.message) {
        // The same generic response is shown for registered and unregistered emails.
      }
    } catch (err) {
      setError(
        err?.message ||
          "We couldn't process your request right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={submitted ? "Check your email" : "Forgot your password?"}
      description={
        submitted
          ? "If your email is registered, password reset instructions will arrive shortly."
          : "Enter the email address linked to your Kaduna Explorer account."
      }
      footer={
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 font-bold text-[#087747] underline-offset-4 transition hover:text-[#103C2A] hover:underline"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      {submitted ? (
        <div className="py-2 text-center" role="status" aria-live="polite">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F4EC] text-[#087747]">
            <CheckCircle2 size={25} aria-hidden="true" />
          </div>
          <p className="text-[13px] leading-6 text-[#536B87]">
            Check your inbox and spam folder for a password reset link. For your
            security, we show the same confirmation whether or not the email
            address is registered.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setError("");
            }}
            className="mt-4 text-sm font-bold text-[#087747] transition hover:text-[#103C2A] hover:underline"
          >
            Try another email address
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="forgot-email"
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
                id="forgot-email"
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

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="flex h-[44px] sm:h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#F9B928] px-5 text-sm font-extrabold text-[#103C2A] shadow-[0_5px_14px_rgba(185,125,16,0.15)] transition hover:bg-[#F4B21C] hover:shadow-[0_7px_18px_rgba(185,125,16,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F4B400]/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending instructions..." : "Send reset link"}
            {!loading && <ArrowRight size={17} aria-hidden="true" />}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
