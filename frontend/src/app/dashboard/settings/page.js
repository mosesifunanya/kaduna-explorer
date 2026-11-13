"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  Camera,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const EMPTY_PROFILE = {
  name: "",
  email: "",
  photo: "",
};

const EMPTY_PASSWORDS = {
  passwordCurrent: "",
  password: "",
  passwordConfirm: "",
};

const inputClass =
  "w-full min-w-0 rounded-xl border border-[#DCE5DA] bg-white px-4 py-3 text-sm text-[#183451] outline-none transition placeholder:text-[#94A3B8] focus:border-[#087747] focus:ring-2 focus:ring-[#087747]/15 disabled:cursor-not-allowed disabled:bg-[#F7F8F4]";

const labelClass = "mb-2 block text-sm font-bold text-[#183451]";

function SectionTitle({ icon: Icon, title, description, tone = "green" }) {
  const iconStyle =
    tone === "gold"
      ? "bg-[#FFF3D8] text-[#8A5B00]"
      : "bg-[#EAF3E9] text-[#103C2A]";

  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${iconStyle}`}
      >
        <Icon size={20} />
      </div>

      <div className="min-w-0">
        <h2 className="text-base font-extrabold text-[#123B79] sm:text-lg">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#63758A]">{description}</p>
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  const {
    user: authenticatedUser,
    authStatus,
    setAuthenticatedUser,
  } = useAuth();

  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (authStatus === "checking") return;

    if (!authenticatedUser) {
      setError("Please sign in to manage your account.");
      setLoading(false);
      return;
    }

    setProfile({
      name: authenticatedUser.name || "",
      email: authenticatedUser.email || "",
      photo: authenticatedUser.photo || "",
    });
    setError("");
    setLoading(false);
  }, [authenticatedUser, authStatus]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function updateProfileField(event) {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    clearMessages();
  }

  function updatePasswordField(event) {
    const { name, value } = event.target;

    setPasswords((current) => ({
      ...current,
      [name]: value,
    }));

    clearMessages();
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    clearMessages();

    if (profile.name.trim().length < 2) {
      setError("Your name must contain at least 2 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await apiRequest("/users/updateMe", {
        method: "PATCH",
        body: JSON.stringify({
          name: profile.name.trim(),
          email: profile.email.trim(),
        }),
      });

      const user = response?.data?.user;

      if (user) {
        setProfile((current) => ({
          ...current,
          name: user.name || "",
          email: user.email || "",
          photo: user.photo || current.photo,
        }));

        // Keep the shared authentication state in sync with profile edits.
        setAuthenticatedUser({
          ...(authenticatedUser || {}),
          ...user,
        });
      }

      setSuccess("Your profile details have been saved.");
    } catch (err) {
      setError(err.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    clearMessages();

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await apiRequest("/users/updateMyPhoto", {
        method: "PATCH",
        body: formData,
      });

      const user = response?.data?.user;

      if (!user?.photo) {
        throw new Error(
          "The server did not return the updated profile picture.",
        );
      }

      setProfile((current) => ({
        ...current,
        photo: user.photo,
      }));

      // Update the shared authentication state so the Header
      // displays the new profile picture immediately.
      setAuthenticatedUser({
        ...(authenticatedUser || {}),
        ...user,
        photo: user.photo,
      });

      setPreview("");
      setSuccess("Your profile picture has been updated.");
    } catch (err) {
      setPreview("");
      setError(
        err.message ||
          "Photo upload failed. Check your backend upload endpoint.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    clearMessages();

    if (passwords.password.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (passwords.password !== passwords.passwordConfirm) {
      setError("Your new passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      await apiRequest("/users/updatePassword", {
        method: "PATCH",
        body: JSON.stringify(passwords),
      });

      setPasswords(EMPTY_PASSWORDS);
      setSuccess("Your password has been changed successfully.");
    } catch (err) {
      setError(err.message || "Unable to change your password.");
    } finally {
      setChangingPassword(false);
    }
  }

  const displayedPhoto = preview || profile.photo;

  const initials =
    profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "KE";

  return (
    <main className="min-h-screen overflow-x-clip bg-[#F7F8F4] text-[#183451]">
      <Header activeNav="plan-trip" />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-bold text-[#087747] transition hover:text-[#103C2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087747]"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>

        <section className="rounded-2xl bg-[#103C2A] px-5 py-6 text-white sm:px-7 sm:py-7">
          <div className="flex items-center gap-2 text-[#FFBD4A]">
            <ShieldCheck size={19} />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]">
              Your account
            </p>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Account settings
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
            Manage your profile, personal details and security.
          </p>
        </section>

        {(error || success) && (
          <div
            className={`mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
            role={error ? "alert" : "status"}
          >
            {error ? (
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            )}
            <p>{error || success}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#63758A]">
            <LoaderCircle size={22} className="animate-spin" />
            Loading your account...
          </div>
        ) : (
          <div className="mt-6 grid min-w-0 grid-cols-1 items-start gap-5 md:grid-cols-[230px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="min-w-0 rounded-2xl border border-[#E3E9E1] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#EAF3E9] bg-[#FFBD4A] text-2xl font-extrabold text-[#103C2A] sm:h-28 sm:w-28 sm:text-3xl">
                    {displayedPhoto ? (
                      <img
                        src={displayedPhoto}
                        alt={`${profile.name || "Your"} profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label="Choose profile picture"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#103C2A] text-white transition hover:bg-[#087747] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD4A] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? (
                      <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                      <Camera size={18} />
                    )}
                  </button>
                </div>

                <h2 className="mt-4 max-w-full break-words text-lg font-extrabold text-[#123B79]">
                  {profile.name || "Your name"}
                </h2>

                <p className="mt-1 max-w-full break-all text-sm text-[#63758A]">
                  {profile.email}
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D7E4D7] px-4 py-2.5 text-sm font-bold text-[#103C2A] transition hover:bg-[#F2F6F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087747] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Camera size={17} />
                  )}
                  {uploading ? "Uploading..." : "Change picture"}
                </button>

                <p className="mt-3 text-xs leading-5 text-[#63758A]">
                  JPEG, PNG or WebP. Maximum 5 MB.
                </p>
              </div>

              <nav
                aria-label="Account navigation"
                className="mt-6 border-t border-[#E8EDE8] pt-4"
              >
                <Link
                  href="/dashboard"
                  className="block rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-[#F2F6F0]"
                >
                  Dashboard
                </Link>

                <Link
                  href="/dashboard/saved"
                  className="mt-1 block rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-[#F2F6F0]"
                >
                  Saved places
                </Link>

                <Link
                  href="/dashboard/trips"
                  className="mt-1 block rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-[#F2F6F0]"
                >
                  My trips
                </Link>
              </nav>
            </aside>

            <div className="min-w-0 space-y-5">
              <section className="min-w-0 rounded-2xl border border-[#E3E9E1] bg-white p-5 shadow-sm sm:p-7">
                <SectionTitle
                  icon={UserRound}
                  title="Personal information"
                  description="Update the name and email associated with your account."
                />

                <form onSubmit={handleProfileSubmit} className="mt-6 space-y-5">
                  <div>
                    <label htmlFor="profile-name" className={labelClass}>
                      Full name
                    </label>
                    <input
                      id="profile-name"
                      name="name"
                      value={profile.name}
                      onChange={updateProfileField}
                      minLength={2}
                      maxLength={60}
                      required
                      autoComplete="name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="profile-email" className={labelClass}>
                      Email address
                    </label>
                    <input
                      id="profile-email"
                      name="email"
                      type="email"
                      value={profile.email}
                      onChange={updateProfileField}
                      required
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#087747] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087747] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {saving ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}
                    {saving ? "Saving changes..." : "Save changes"}
                  </button>
                </form>
              </section>

              <section className="min-w-0 rounded-2xl border border-[#E3E9E1] bg-white p-5 shadow-sm sm:p-7">
                <SectionTitle
                  icon={LockKeyhole}
                  title="Change password"
                  description="Confirm your current password before choosing a new one."
                  tone="gold"
                />

                <form
                  onSubmit={handlePasswordSubmit}
                  className="mt-6 space-y-5"
                >
                  <div>
                    <label htmlFor="password-current" className={labelClass}>
                      Current password
                    </label>
                    <input
                      id="password-current"
                      name="passwordCurrent"
                      type="password"
                      value={passwords.passwordCurrent}
                      onChange={updatePasswordField}
                      required
                      autoComplete="current-password"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="password-new" className={labelClass}>
                      New password
                    </label>
                    <input
                      id="password-new"
                      name="password"
                      type="password"
                      value={passwords.password}
                      onChange={updatePasswordField}
                      minLength={8}
                      required
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="password-confirm" className={labelClass}>
                      Confirm new password
                    </label>
                    <input
                      id="password-confirm"
                      name="passwordConfirm"
                      type="password"
                      value={passwords.passwordConfirm}
                      onChange={updatePasswordField}
                      minLength={8}
                      required
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#087747] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087747] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {changingPassword && (
                      <LoaderCircle size={17} className="animate-spin" />
                    )}

                    {changingPassword
                      ? "Updating password..."
                      : "Update password"}
                  </button>
                </form>
              </section>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
