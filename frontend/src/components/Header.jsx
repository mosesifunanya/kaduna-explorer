"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import {
  Menu,
  Search,
  X,
  Map,
  UserRound,
  ChevronDown,
  Heart,
  Settings,
  LogOut,
  LoaderCircle,
} from "lucide-react";

import { navigationLinks } from "@/lib/homeData";
import OptimizedImage from "@/components/OptimizedImage";

import { apiRequest } from "@/lib/api";

import { useAuth } from "@/components/AuthProvider";
import { useRouteTransition } from "@/components/RouteTransitionProvider";

import { notifyFavoriteAuthChanged } from "@/hooks/destination/useDestinationFavorite";

export default function Header({ activeNav }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [shouldScrollToContact, setShouldScrollToContact] = useState(false);

  const { user, authStatus, setAuthenticatedUser } = useAuth();

  const pathname = usePathname();

  const router = useRouter();

  const { startNavigation } = useRouteTransition();

  const profileDropdownRef = useRef(null);

  // Complete Contact Us navigation after returning to the homepage.

  useEffect(() => {
    if (!shouldScrollToContact || pathname !== "/") return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("footer-contact")?.scrollIntoView({
        behavior: "smooth",

        block: "start",
      });

      setShouldScrollToContact(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, shouldScrollToContact]);

  const isDashboard = pathname.startsWith("/dashboard");

  // Close the profile dropdown when clicking outside it or pressing Escape.

  useEffect(() => {
    if (!profileOpen) return;

    function handleOutsideClick(event) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);

      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [profileOpen]);

  function navigate(href) {
    setMenuOpen(false);

    setProfileOpen(false);

    if (href === "/#about") {
      if (pathname === "/") {
        document.getElementById("about")?.scrollIntoView({
          behavior: "smooth",

          block: "start",
        });
      } else {
        startNavigation("/#about");
        router.push("/#about");
      }

      return;
    }

    // Clicking the current section should return the page to the top.

    const targetPath = href.split("?")[0].split("#")[0];

    const isCurrentSection =
      pathname === targetPath ||
      (targetPath === "/events" && pathname.startsWith("/events")) ||
      (targetPath === "/guides" && pathname.startsWith("/guides"));

    if (isCurrentSection) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });

      return;
    }

    // Start the destination at the top immediately; the shared navigation
    // handles the route change without waiting for page data.
    startNavigation(href);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    router.push(href, { scroll: false });
  }

  // Navigate to the Get in Touch section of the shared footer.

  function goToContact() {
    setMenuOpen(false);

    setProfileOpen(false);

    const contactSection = document.getElementById("footer-contact");

    if (contactSection) {
      contactSection.scrollIntoView({
        behavior: "smooth",

        block: "start",
      });

      return;
    }

    setShouldScrollToContact(true);

    if (pathname !== "/") {
      startNavigation("/");
      router.push("/");
    }
  }

  function handleRouteLinkClick(event, href) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (
      event.currentTarget?.target === "_blank" ||
      event.currentTarget?.hasAttribute("download")
    )
      return;
    startNavigation(href);
  }

  function isLinkActive(key) {
    if (key === "home") return pathname === "/";

    if (key === "explore") return pathname.startsWith("/explore");

    if (key === "events") return pathname.startsWith("/events");

    if (key === "guides") return pathname.startsWith("/guides");

    if (key === "about") return false;

    return activeNav === key;
  }

  function renderLinks(mobile = false) {
    return navigationLinks.map(({ label, href, key }) => {
      const active = isLinkActive(key);

      return (
        <Link
          key={key}
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={(event) => {
            const targetPath = href.split("?")[0].split("#")[0];
            const isCurrentSection =
              pathname === targetPath ||
              (targetPath === "/events" && pathname.startsWith("/events")) ||
              (targetPath === "/guides" && pathname.startsWith("/guides"));

            if (href === "/#about" || isCurrentSection) {
              event.preventDefault();
              navigate(href);
              return;
            }

            // Let Next.js Link handle navigation and prefetching.
            handleRouteLinkClick(event, href);
            setMenuOpen(false);
            setProfileOpen(false);
          }}
          className={
            mobile
              ? `block border-b py-3.5 text-sm font-semibold transition ${
                  active
                    ? "border-[#FFBD4A] text-[#FFBD4A]"
                    : "border-white/10 text-white hover:text-[#FFBD4A]"
                }`
              : `whitespace-nowrap border-b-2 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-[#FFBD4A] text-[#FFBD4A]"
                    : "border-transparent text-white/90 hover:border-[#FFBD4A] hover:text-[#FFBD4A]"
                }`
          }
        >
          {label}
        </Link>
      );
    });
  }

  async function handleLogout() {
    setLoading(true);

    setError("");

    try {
      await apiRequest("/users/logout", {
        method: "POST",
      });

      setAuthenticatedUser(null);
      toast.success("You’ve been logged out", {
        description: "Your session has ended. We hope to see you again!",
      });

      // Clear the shared favourites state after logout.

      void notifyFavoriteAuthChanged();

      setProfileOpen(false);

      setMenuOpen(false);

      router.replace("/");

      router.refresh();
    } catch (err) {
      setError(err?.message || "Unable to sign out. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // A single circular crop with no additional border around the photo.

  function ProfileAvatar({ size = "h-9 w-9" }) {
    return user?.photo ? (
      <OptimizedImage
        src={user.photo}
        alt={`${user.name || "User"} profile`}
        width={size === "h-11 w-11" ? 44 : 36}
        height={size === "h-11 w-11" ? 44 : 36}
        sizes={size === "h-11 w-11" ? "44px" : "36px"}
        className={`${size} block shrink-0 rounded-full object-cover`}
      />
    ) : (
      <span
        className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#FFBD4A] text-[#103C2A]`}
      >
        <UserRound size={20} />
      </span>
    );
  }

  // Authentication is still being checked.

  // Keep the space stable without displaying incorrect sign-in controls.

  function AuthLoadingIndicator() {
    return (
      <div
        className="flex h-10 min-w-[82px] items-center justify-center"
        role="status"
        aria-label="Checking your account"
      >
        <LoaderCircle
          size={18}
          className="animate-spin text-white/70"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <header
      className="sticky top-0 z-[100] m-0 block w-screen max-w-none border-b border-white/10 bg-[#103C2A] shadow-md"
      style={{
        position: "sticky",
        top: 0,
        width: "100vw",
        maxWidth: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        minHeight: "76px",
        backgroundColor: "#103C2A",
        isolation: "isolate",
        backfaceVisibility: "hidden",
      }}
    >
      <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:gap-5 lg:px-8">
        {/*  Brand logo  */}

        <Link
          href="/"
          aria-label="Kaduna Explorer home"
          onClick={(event) => {
            handleRouteLinkClick(event, "/");
            setMenuOpen(false);
          }}
          className="shrink-0"
        >
          <OptimizedImage
            src="/assets/brand/logo-horizontal.png"
            alt="Kaduna Explorer"
            width={2020}
            height={778}
            sizes="(min-width: 1024px) 175px, (min-width: 640px) 155px, 125px"
            priority
            className="block h-auto w-[125px] object-contain sm:w-[155px] lg:w-[175px]"
          />
        </Link>

        {/*  Desktop navigation  */}

        <nav
          aria-label="Main navigation"
          className="hidden min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap min-[1200px]:flex 2xl:gap-4"
        >
          {renderLinks()}

          <button
            type="button"
            onClick={goToContact}
            className="whitespace-nowrap border-b-2 border-transparent py-3 text-sm font-semibold text-white/90 transition hover:border-[#FFBD4A] hover:text-[#FFBD4A]"
          >
            Contact Us
          </button>
        </nav>

        {/*  Right-side actions  */}

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Search places"
            onClick={() => navigate("/explore")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition hover:border-[#FFBD4A] hover:bg-white/10 hover:text-[#FFBD4A]"
          >
            <Search size={20} />
          </button>

          <div className="hidden min-w-[170px] shrink-0 items-center justify-end min-[1200px]:flex">
            {authStatus === "checking" ? (
              <AuthLoadingIndicator />
            ) : user ? (
              <div ref={profileDropdownRef} className="relative">
                <button
                  type="button"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setProfileOpen((open) => !open);

                    setError("");
                  }}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 p-1 pr-2.5 text-white transition hover:border-[#FFBD4A] hover:bg-white/15 sm:gap-3 sm:pr-3"
                >
                  <ProfileAvatar />

                  <span className="hidden max-w-[130px] text-left sm:block">
                    <span className="block truncate text-xs font-bold">
                      {user.name || "My account"}
                    </span>

                    <span className="block text-[10px] text-white/70">
                      {isDashboard ? "Dashboard" : "Signed in"}
                    </span>
                  </span>

                  <ChevronDown
                    size={16}
                    className={`hidden transition-transform sm:block ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-2xl border border-[#E2E9E1] bg-white p-2 text-[#183451] shadow-xl"
                  >
                    <div className="flex items-center gap-3 border-b border-[#E8EDE8] px-3 py-3">
                      <ProfileAvatar size="h-11 w-11" />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-[#123B79]">
                          {user.name || "My account"}
                        </p>

                        <p className="truncate text-xs text-[#63758A]">
                          {user.email || ""}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/dashboard"
                      role="menuitem"
                      onClick={(event) => {
                        handleRouteLinkClick(
                          event,
                          event.currentTarget.getAttribute("href"),
                        );
                        setProfileOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-[#F2F6F0]"
                    >
                      <UserRound size={18} />
                      Dashboard
                    </Link>

                    <Link
                      href="/dashboard/saved"
                      role="menuitem"
                      onClick={(event) => {
                        handleRouteLinkClick(
                          event,
                          event.currentTarget.getAttribute("href"),
                        );
                        setProfileOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-[#F2F6F0]"
                    >
                      <Heart size={18} />
                      Saved places
                    </Link>

                    <Link
                      href="/dashboard/trips"
                      role="menuitem"
                      onClick={(event) => {
                        handleRouteLinkClick(
                          event,
                          event.currentTarget.getAttribute("href"),
                        );
                        setProfileOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-[#F2F6F0]"
                    >
                      <Map size={18} />
                      My trips
                    </Link>

                    <Link
                      href="/dashboard/settings"
                      role="menuitem"
                      onClick={(event) => {
                        handleRouteLinkClick(
                          event,
                          event.currentTarget.getAttribute("href"),
                        );
                        setProfileOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-[#F2F6F0]"
                    >
                      <Settings size={18} />
                      Account settings
                    </Link>

                    {error && (
                      <p
                        role="alert"
                        className="mx-2 my-1 rounded-lg bg-red-50 p-2 text-xs leading-5 text-red-700"
                      >
                        {error}
                      </p>
                    )}

                    <div className="my-1 border-t border-[#E8EDE8]" />

                    <button
                      type="button"
                      role="menuitem"
                      disabled={loading}
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LogOut size={18} />

                      {loading ? "Signing out..." : "Sign out"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden shrink-0 rounded-lg px-2 py-3 text-sm font-semibold text-white transition hover:text-[#FFBD4A] min-[1200px]:block"
                >
                  Sign in
                </Link>

                <Link
                  href="/signup"
                  className="hidden shrink-0 rounded-xl border border-[#FFBD4A] px-3 py-3 text-sm font-bold text-white transition hover:bg-[#FFBD4A] hover:text-[#103C2A] min-[1200px]:block"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/*  Responsive navigation toggle  */}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/25 p-2.5 text-white transition hover:border-[#FFBD4A] hover:bg-white/10 hover:text-[#FFBD4A] min-[1200px]:hidden"
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {/*  Tablet and mobile navigation  */}

      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-white/15 bg-[#103C2A] px-5 py-2 min-[1200px]:hidden"
        >
          {renderLinks(true)}

          <button
            type="button"
            onClick={goToContact}
            className="block w-full border-b border-white/10 py-3.5 text-left text-sm font-semibold text-white transition hover:text-[#FFBD4A]"
          >
            Contact Us
          </button>

          <div className="grid grid-cols-2 gap-3 py-4">
            {authStatus === "checking" ? (
              <div className="col-span-2 flex min-h-12 items-center justify-center gap-2 text-sm text-white/70">
                <LoaderCircle size={17} className="animate-spin" />
                Checking your account...
              </div>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={(event) => {
                    handleRouteLinkClick(
                      event,
                      event.currentTarget.getAttribute("href"),
                    );
                    setMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/30 px-3 py-3 text-sm font-semibold text-white"
                >
                  <UserRound size={16} />
                  Dashboard
                </Link>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#FFBD4A] px-3 py-3 text-sm font-bold text-[#103C2A] disabled:opacity-60"
                >
                  <LogOut size={16} />

                  {loading ? "Signing out..." : "Sign out"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={(event) => {
                    handleRouteLinkClick(
                      event,
                      event.currentTarget.getAttribute("href"),
                    );
                    setMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/30 px-3 py-3 text-sm font-semibold text-white"
                >
                  <UserRound size={16} />
                  Sign in
                </Link>

                <Link
                  href="/signup"
                  onClick={(event) => {
                    handleRouteLinkClick(
                      event,
                      event.currentTarget.getAttribute("href"),
                    );
                    setMenuOpen(false);
                  }}
                  className="flex items-center justify-center rounded-xl bg-[#FFBD4A] px-3 py-3 text-sm font-bold text-[#103C2A]"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {user && (
            <>
              <Link
                href="/dashboard/saved"
                onClick={(event) => {
                  handleRouteLinkClick(
                    event,
                    event.currentTarget.getAttribute("href"),
                  );
                  setMenuOpen(false);
                }}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                <Heart size={16} />
                Saved places
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={(event) => {
                  handleRouteLinkClick(
                    event,
                    event.currentTarget.getAttribute("href"),
                  );
                  setMenuOpen(false);
                }}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                <Settings size={16} />
                Account settings
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => navigate("/dashboard/trips")}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold text-white hover:bg-white/15"
          >
            <Map size={16} />
            Plan Trip
          </button>

          {error && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </nav>
      )}
    </header>
  );
}
