"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  LayoutDashboard,
  MapPin,
  CalendarDays,
  Star,
  Users,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  ShieldCheck,
  LoaderCircle,
  CircleAlert,
  Home,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const SETTINGS_KEY = "kaduna-explorer-admin-settings-v1";
const THEME_EVENT = "kaduna-explorer-theme-change";

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Homepage", href: "/admin/homepage", icon: Home },
  { label: "Destinations", href: "/admin/destinations", icon: MapPin },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function getUserFromResponse(response) {
  return (
    response?.data?.data?.user ||
    response?.data?.user ||
    response?.user ||
    response?.data ||
    response ||
    null
  );
}

function isAdmin(user) {
  return String(user?.role || user?.userRole || "").toLowerCase() === "admin";
}

function isActiveRoute(pathname, href) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageTitle(pathname) {
  if (pathname === "/admin") return "Overview";
  if (pathname.startsWith("/admin/homepage")) return "Homepage Management";

  if (pathname.startsWith("/admin/destinations")) {
    if (pathname.includes("/edit")) return "Edit destination";
    if (pathname.endsWith("/new")) return "Add destination";
    return "Destinations";
  }

  if (pathname.startsWith("/admin/events")) {
    if (pathname.includes("/edit")) return "Edit event";
    if (pathname.endsWith("/new")) return "Add event";
    if (pathname.includes("/banners")) return "Event banners";
    return "Events";
  }

  if (pathname.startsWith("/admin/reviews")) return "Reviews";
  if (pathname.startsWith("/admin/users")) return "Users";
  if (pathname.startsWith("/admin/settings")) return "Settings";

  return "Administration";
}

function getSavedTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return saved?.appearance?.theme || "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  document.documentElement.dataset.adminTheme = resolved;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;

  return resolved;
}

function SidebarContent({
  pathname,
  onNavigate,
  onLogout,
  loggingOut,
  collapsed,
  onToggleCollapse,
  theme,
  onThemeChange,
}) {
  const ThemeIcon =
    theme === "dark" ? Moon : theme === "system" ? Monitor : Sun;

  return (
    <div className="admin-sidebar flex h-full min-h-0 flex-col bg-[#103C2A] text-white">
      <div
        className={`flex h-[76px] shrink-0 items-center border-b border-white/10 ${
          collapsed ? "justify-center px-3" : "justify-between px-5"
        }`}
      >
        <Link
          href="/admin"
          onClick={onNavigate}
          aria-label="Kaduna Explorer admin home"
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFBD4A] text-[#103C2A] shadow-sm">
            <Compass size={25} strokeWidth={2.4} />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight text-white">
                Kaduna Explorer
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Administration
              </p>
            </div>
          )}
        </Link>

        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="hidden rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:inline-flex"
          >
            <ChevronLeft size={17} />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!collapsed && (
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Workspace
          </p>
        )}

        <nav className="space-y-1.5" aria-label="Admin navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 transition ${
                  active
                    ? "bg-[#FFBD4A] font-semibold text-[#103C2A] shadow-sm"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                {active && (
                  <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-white/70" />
                )}

                <Icon size={19} className="shrink-0" />

                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 text-sm">{item.label}</span>
                    {active && <ChevronRight size={16} />}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <>
            <div className="my-6 border-t border-white/10" />

            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Appearance
            </p>

            <div className="rounded-xl bg-white/[0.06] p-3">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-white/80">
                <ThemeIcon size={17} />
                <span>Admin theme</span>
              </div>

              <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/15 p-1">
                {[
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "System", icon: Monitor },
                ].map((option) => {
                  const Icon = option.icon;
                  const selected = theme === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onThemeChange(option.value)}
                      aria-pressed={selected}
                      title={`${option.label} theme`}
                      className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold transition ${
                        selected
                          ? "bg-[#FFBD4A] text-[#103C2A]"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={16} />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <Link
                href="/admin/settings"
                onClick={onNavigate}
                className="mt-3 flex items-center justify-between rounded-lg px-2 py-2 text-xs text-white/65 transition hover:bg-white/10 hover:text-white"
              >
                More preferences
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="my-6 border-t border-white/10" />

            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Platform
            </p>

            <Link
              href="/"
              target="_blank"
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <Home size={19} className="shrink-0" />
              <span className="flex-1 text-sm">Visit website</span>
              <ExternalLink size={14} className="text-white/40" />
            </Link>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        {!collapsed && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FFBD4A]">
              <ShieldCheck size={19} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                Administrator
              </p>
              <p className="mt-1 text-[10px] text-white/50">
                Protected workspace
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          title={collapsed ? "Sign out" : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/75 transition hover:bg-red-500/15 hover:text-red-200 disabled:opacity-60 ${
            collapsed ? "justify-center px-2" : ""
          }`}
        >
          {loggingOut ? (
            <LoaderCircle size={19} className="animate-spin" />
          ) : (
            <LogOut size={19} />
          )}

          {!collapsed && (
            <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
          )}
        </button>
      </div>
    </div>
  );
}

function AdminLayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [theme, setTheme] = useState("light");

  const { user, authStatus, setAuthenticatedUser } = useAuth();

  const changeTheme = useCallback((nextTheme) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);

    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");

      saved.appearance = {
        ...(saved.appearance || {}),
        theme: nextTheme,
      };

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved));
    } catch {
      // Theme still applies for the current session if storage is unavailable.
    }

    window.dispatchEvent(
      new CustomEvent(THEME_EVENT, { detail: { theme: nextTheme } }),
    );
  }, []);

  useEffect(() => {
    const initialTheme = getSavedTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);

    const handleThemeChange = (event) => {
      const nextTheme = event.detail?.theme || getSavedTheme();
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    const handleStorage = (event) => {
      if (event.key === SETTINGS_KEY) {
        const nextTheme = getSavedTheme();
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }
    };

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemChange = () => {
      if (getSavedTheme() === "system") applyTheme("system");
    };

    window.addEventListener(THEME_EVENT, handleThemeChange);
    window.addEventListener("storage", handleStorage);
    media.addEventListener?.("change", handleSystemChange);

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange);
      window.removeEventListener("storage", handleStorage);
      media.removeEventListener?.("change", handleSystemChange);
    };
  }, []);

  useEffect(() => {
    if (authStatus === "checking") {
      setCheckingAccess(true);
      setAccessError("");
      return;
    }

    if (!user || !isAdmin(user)) {
      setAdminUser(null);
      setCheckingAccess(false);
      router.replace("/login");
      return;
    }

    setAdminUser(user);
    setAccessError("");
    setCheckingAccess(false);
  }, [authStatus, user, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await apiRequest("users/logout", { method: "POST" });
    } catch {
      // Continue to login if the logout endpoint is unavailable.
    } finally {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("jwt");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("jwt");
      } catch {
        // Continue to the login page.
      }

      setAuthenticatedUser(null);
      router.replace("/login");
      router.refresh();
    }
  }, [loggingOut, router, setAuthenticatedUser]);

  const pageTitle = getPageTitle(pathname);

  if (checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9F7] px-5">
        <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#103C2A] text-[#FFBD4A]">
            <Compass size={28} />
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-gray-800">
            <LoaderCircle size={17} className="animate-spin text-[#176B48]" />
            Verifying administrator access
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Please wait while we check your account.
          </p>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9F7] px-5 py-8">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <CircleAlert size={24} />
          </div>

          <h1 className="mt-4 text-xl font-bold text-gray-900">
            Admin access unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">{accessError}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-[#103C2A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#176B48]"
          >
            Try again
          </button>

          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-3 block w-full rounded-xl px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  if (!adminUser) return null;

  return (
    <div className="admin-shell min-h-screen bg-[#F7F9F7] text-gray-900">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block ${
          sidebarCollapsed ? "w-[84px]" : "w-[270px]"
        }`}
      >
        <SidebarContent
          pathname={pathname}
          onNavigate={() => setMobileMenuOpen(false)}
          onLogout={handleLogout}
          loggingOut={loggingOut}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          theme={theme}
          onThemeChange={changeTheme}
        />

        {sidebarCollapsed && (
          <>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="absolute -right-3 top-[88px] flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:text-[#176B48]"
            >
              <ChevronRight size={15} />
            </button>

            <button
              type="button"
              onClick={() => changeTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } mode`}
              title={`Switch theme (${theme})`}
              className="absolute bottom-[116px] left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-xl bg-white/10 text-[#FFBD4A] hover:bg-white/20"
            >
              {theme === "dark" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
          </>
        )}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-gray-950/55 backdrop-blur-[2px]"
          />

          <aside className="absolute inset-y-0 left-0 flex w-[min(290px,85vw)] flex-col shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
            >
              <X size={19} />
            </button>

            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMobileMenuOpen(false)}
              onLogout={handleLogout}
              loggingOut={loggingOut}
              collapsed={false}
              onToggleCollapse={null}
              theme={theme}
              onThemeChange={changeTheme}
            />
          </aside>
        </div>
      )}

      <div
        className={`min-h-screen min-w-0 transition-[margin] duration-200 ${
          sidebarCollapsed ? "lg:ml-[84px]" : "lg:ml-[270px]"
        }`}
      >
        <header className="admin-header sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur-xl">
          <div className="flex min-h-[72px] items-center justify-between gap-3 px-3 sm:px-5 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:text-[#176B48] lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs font-medium text-gray-400 sm:inline">
                    Admin
                  </span>

                  <ChevronRight
                    size={13}
                    className="hidden text-gray-300 sm:inline"
                  />

                  <h1 className="truncate text-sm font-bold text-gray-900 sm:text-base">
                    {pageTitle}
                  </h1>
                </div>

                <p className="mt-1 hidden text-xs text-gray-500 sm:block">
                  Kaduna Explorer management workspace
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => changeTheme(theme === "dark" ? "light" : "dark")}
                aria-label={`Switch to ${
                  theme === "dark" ? "light" : "dark"
                } mode`}
                title={`Switch theme (${theme})`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:border-emerald-200 hover:text-[#176B48]"
              >
                {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
              </button>

              <Link
                href="/"
                target="_blank"
                aria-label="Visit public website"
                title="Visit website"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:text-[#176B48] sm:w-auto sm:gap-2 sm:px-3"
              >
                <ExternalLink size={16} />

                <span className="hidden text-xs font-semibold sm:inline">
                  Website
                </span>
              </Link>

              <div className="hidden h-8 w-px bg-gray-200 sm:block" />

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#103C2A] text-sm font-bold text-[#FFBD4A]">
                {String(
                  adminUser.name ||
                    adminUser.firstName ||
                    adminUser.email ||
                    "A",
                )
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="hidden min-w-0 max-w-[150px] md:block">
                <p className="admin-user-name truncate text-xs font-bold text-gray-800">
                  {adminUser.name ||
                    [adminUser.firstName, adminUser.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    "Administrator"}
                </p>

                <p className="mt-0.5 truncate text-[10px] capitalize text-gray-400">
                  {adminUser.role || "Admin"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-main min-w-0 p-3 sm:p-4 lg:p-4">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
