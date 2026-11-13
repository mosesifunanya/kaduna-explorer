"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, CalendarDays, Bookmark, UserRound } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { useRouteTransition } from "@/components/RouteTransitionProvider";

const navigationItems = [
  {
    label: "Home",
    icon: Home,
    href: "/",
    key: "home",
  },
  {
    label: "Explore",
    icon: Search,
    href: "/explore",
    key: "explore",
  },
  {
    label: "Events",
    icon: CalendarDays,
    href: "/events",
    key: "events",
  },
  {
    label: "Saved",
    icon: Bookmark,
    href: "/dashboard/saved",
    key: "saved",
  },
];

export default function MobileBottomNavigation({ activeNav, onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();
  const previousPathnameRef = useRef(pathname);

  const { user, authStatus } = useAuth();
  const { startNavigation } = useRouteTransition();

  const [hasMounted, setHasMounted] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Ensure server and initial browser renders use identical auth-dependent markup.
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // A client-side route change must always begin at the top.
  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;

    previousPathnameRef.current = pathname;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  useEffect(() => {
    setImageError(false);
  }, [user?.photo]);

  function isActive(key) {
    if (key === "home") return pathname === "/";

    if (key === "explore") {
      return pathname.startsWith("/explore");
    }

    if (key === "events") {
      return pathname.startsWith("/events");
    }

    if (key === "saved") {
      return pathname.startsWith("/dashboard/saved");
    }

    return false;
  }

  const profileActive =
    pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/dashboard/saved");

  const profileHref =
    hasMounted && authStatus === "authenticated" && user
      ? "/dashboard"
      : "/login";

  function handleNavigation(event, key, href) {
    event.preventDefault();

    onNavigate?.(key);

    const targetPath = href.split("?")[0].split("#")[0];
    const currentPath = window.location.pathname;

    if (currentPath === targetPath) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });

      return;
    }

    startNavigation(href);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    router.push(href, { scroll: false });
  }

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 w-full pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div className="grid w-full grid-cols-5 items-center border-t border-[#E6EAE5] bg-white px-1 py-2 shadow-[0_-4px_24px_rgba(16,60,42,0.12)]">
        {navigationItems.map(({ label, icon: Icon, href, key }) => {
          const active = isActive(key);

          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={(event) => handleNavigation(event, key, href)}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1.5 py-1.5 transition-colors duration-200 ${
                active ? "text-[#FFBD00]" : "text-[#103C2A]"
              }`}
            >
              <Icon
                size={27}
                strokeWidth={active ? 2.7 : 2.2}
                fill={active && key === "home" ? "currentColor" : "none"}
                aria-hidden="true"
              />

              <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#103C2A]">
                {label}
              </span>

              <span
                className={`absolute bottom-[-3px] h-[4px] w-3/4 rounded-full bg-[#FFBD00] transition-all duration-200 ${
                  active ? "scale-100 opacity-100" : "scale-75 opacity-0"
                }`}
              />
            </Link>
          );
        })}

        <Link
          href={profileHref}
          aria-current={profileActive ? "page" : undefined}
          aria-label="Profile"
          onClick={(event) => handleNavigation(event, "profile", profileHref)}
          className={`relative flex min-w-0 flex-col items-center justify-center gap-1.5 py-1.5 transition-colors duration-200 ${
            profileActive ? "text-[#FFBD00]" : "text-[#103C2A]"
          }`}
        >
          {hasMounted && user?.photo && !imageError ? (
            <img
              src={user.photo}
              alt=""
              onError={() => setImageError(true)}
              className={`h-[32px] w-[32px] rounded-full border-[3px] object-cover ${
                profileActive ? "border-[#FFBD00]" : "border-[#103C2A]"
              }`}
            />
          ) : (
            <UserRound
              size={27}
              strokeWidth={profileActive ? 2.7 : 2.2}
              aria-hidden="true"
            />
          )}

          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#103C2A]">
            Profile
          </span>

          <span
            className={`absolute bottom-[-3px] h-[4px] w-3/4 rounded-full bg-[#FFBD00] transition-all duration-200 ${
              profileActive ? "scale-100 opacity-100" : "scale-75 opacity-0"
            }`}
          />
        </Link>
      </div>
    </nav>
  );
}
