"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { apiRequest } from "@/lib/api";

const inputClass =
  "h-[40px] sm:h-[46px] w-full rounded-xl border border-[#D7E0E9] bg-white/90 px-4 text-sm text-[#183451] outline-none transition placeholder:text-[#91A0B3] hover:border-[#B7C7D6] focus:border-[#087747] focus:ring-4 focus:ring-[#087747]/10 disabled:cursor-not-allowed disabled:opacity-70";

function ResetPasswordForm() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError(
        "This password reset link is incomplete. Please request a new one.",
      );
      return;
    }

    if (password !== passwordConfirm) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest(`users/resetPassword/${encodeURIComponent(token)}`, {
        method: "PATCH",
        body: { password, passwordConfirm },
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err?.message ||
          "We couldn't reset your password. The link may have expired.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={success ? "Password updated" : "Create a new password"}
      description={
        success
          ? "Your Kaduna Explorer password has been changed successfully."
          : "Choose a strong password to secure your Kaduna Explorer account."
      }
      footer={
        success ? (
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 font-bold text-[#087747] underline-offset-4 transition hover:text-[#103C2A] hover:underline"
          >
            Continue to sign in <ArrowRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 font-bold text-[#087747] underline-offset-4 transition hover:text-[#103C2A] hover:underline"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to sign in
          </Link>
        )
      }
    >
      {success ? (
        <div className="py-2 text-center" role="status" aria-live="polite">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F4EC] text-[#087747]">
            <CheckCircle2 size={25} aria-hidden="true" />
          </div>
          <p className="text-[13px] leading-6 text-[#536B87]">
            Your new password is ready. You can now sign in using it.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-4 inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#F9B928] px-5 text-sm font-extrabold text-[#103C2A] transition hover:bg-[#F4B21C] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F4B400]/30"
          >
            Go to sign in <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
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
              htmlFor="reset-password"
              className="mb-1 sm:mb-1.5 block text-[12px] sm:text-sm font-bold text-[#183451]"
            >
              New password
            </label>
            <div className="relative">
              <LockKeyhole
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#24496E]"
              />
              <input
                id="reset-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your new password"
                required
                disabled={loading}
                className={`${inputClass} pl-11 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#536B87] transition hover:text-[#087747] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087747]"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="reset-password-confirm"
              className="mb-1 sm:mb-1.5 block text-[12px] sm:text-sm font-bold text-[#183451]"
            >
              Confirm new password
            </label>
            <div className="relative">
              <LockKeyhole
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#24496E]"
              />
              <input
                id="reset-password-confirm"
                name="passwordConfirm"
                type={showConfirmation ? "text" : "password"}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="Re-enter your new password"
                required
                disabled={loading}
                className={`${inputClass} pl-11 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmation((visible) => !visible)}
                aria-label={
                  showConfirmation ? "Hide confirmation" : "Show confirmation"
                }
                aria-pressed={showConfirmation}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#536B87] transition hover:text-[#087747] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087747]"
              >
                {showConfirmation ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <p className="text-[11px] leading-5 text-[#6B7D91]">
            Use a password that meets the security requirements for your
            account.
          </p>

          <button
            type="submit"
            disabled={loading || !password || !passwordConfirm}
            className="flex h-[44px] sm:h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#F9B928] px-5 text-sm font-extrabold text-[#103C2A] shadow-[0_5px_14px_rgba(185,125,16,0.15)] transition hover:bg-[#F4B21C] hover:shadow-[0_7px_18px_rgba(185,125,16,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F4B400]/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating password..." : "Reset password"}
            {!loading && <ArrowRight size={17} aria-hidden="true" />}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
