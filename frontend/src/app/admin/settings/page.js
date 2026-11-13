"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  SlidersHorizontal,
  MapPin,
  Star,
  Bell,
  Palette,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Save,
  RotateCcw,
  ChevronRight,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Image as ImageIcon,
  Users,
  LockKeyhole,
  LoaderCircle,
  Settings2,
} from "lucide-react";

const STORAGE_KEY = "kaduna-explorer-admin-settings-v1";
const THEME_EVENT = "kaduna-explorer-theme-change";

const DEFAULT_SETTINGS = {
  general: {
    siteName: "Kaduna Explorer",
    tagline: "Discover the beauty of Kaduna State",
    siteDescription:
      "Explore destinations, culture, restaurants, accommodation and experiences across Kaduna State.",
    contactEmail: "",
    contactPhone: "",
    siteAddress: "Kaduna State, Nigeria",
    websiteUrl: "http://localhost:3000",
    maintenanceMode: false,
    showContactInformation: true,
  },
  destinations: {
    requireApproval: true,
    autoPublish: false,
    allowSubmissions: true,
    requireImages: true,
    maximumImages: 10,
    maximumImageSize: 5,
    showUnpublishedInAdmin: true,
    defaultPriceLevel: "unknown",
  },
  reviews: {
    allowReviews: true,
    requireModeration: true,
    allowGuestReviews: false,
    showRatings: true,
    allowReviewEditing: true,
    notifyOnNewReview: true,
  },
  notifications: {
    newDestination: true,
    newReview: true,
    newUser: false,
    moderationRequired: true,
    systemAlerts: true,
    emailNotifications: false,
    browserNotifications: false,
  },
  appearance: {
    theme: "light",
    compactMode: false,
    showAnimations: true,
    sidebarCollapsed: false,
    dashboardCharts: true,
    showWelcomeMessage: true,
  },
  security: {
    sessionReminder: true,
    confirmDestructiveActions: true,
    warnBeforeLeaving: true,
    showSecurityNotice: true,
  },
};

const SECTIONS = [
  {
    id: "general",
    label: "General",
    description: "Website identity and contact details",
    icon: SlidersHorizontal,
  },
  {
    id: "destinations",
    label: "Destinations",
    description: "Submission and publishing preferences",
    icon: MapPin,
  },
  {
    id: "reviews",
    label: "Reviews",
    description: "Review and moderation preferences",
    icon: Star,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Choose your preferred admin alerts",
    icon: Bell,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Personalize your administration workspace",
    icon: Palette,
  },
  {
    id: "security",
    label: "Security",
    description: "Browser-side security preferences",
    icon: ShieldCheck,
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS).map(([section, defaults]) => [
        section,
        { ...defaults, ...(stored[section] || {}) },
      ]),
    );
  } catch {
    return clone(DEFAULT_SETTINGS);
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
}

function publishTheme(theme) {
  applyTheme(theme);

  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }));
}

function Input({ value, onChange, type = "text", placeholder }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#176B48] focus:ring-4 focus:ring-[#176B48]/10"
    />
  );
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none focus:border-[#176B48] focus:ring-4 focus:ring-[#176B48]/10"
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#176B48] focus:ring-4 focus:ring-[#176B48]/10"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="min-w-0 space-y-2">
      <label className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-4 focus:ring-[#176B48]/15 ${
        checked ? "bg-[#176B48]" : "bg-slate-300"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SettingRow({ title, description, checked, onChange, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-5 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#176B48]/[0.08] text-[#176B48]">
            <Icon size={19} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Card({ title, description, icon: Icon, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#176B48]/[0.08] text-[#176B48]">
            <Icon size={21} />
          </div>
        )}
        <div>
          <h2 className="text-base font-bold text-[#103C2A] sm:text-lg">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="px-5 sm:px-7">{children}</div>
    </section>
  );
}

function Notice({ type = "info", children }) {
  const styles = {
    info: "border-blue-100 bg-blue-50 text-blue-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    error: "border-red-100 bg-red-50 text-red-800",
  };
  const Icon =
    type === "warning" || type === "error"
      ? AlertTriangle
      : type === "success"
        ? CheckCircle2
        : Info;

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${styles[type]}`}
    >
      <Icon size={19} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState("general");
  const [settings, setSettings] = useState(clone(DEFAULT_SETTINGS));
  const [savedSettings, setSavedSettings] = useState(clone(DEFAULT_SETTINGS));
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial = readSettings();
    setSettings(initial);
    setSavedSettings(clone(initial));
    setHydrated(true);
    applyTheme(initial.appearance.theme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemTheme = () => {
      if (readSettings().appearance.theme === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener?.("change", handleSystemTheme);
    return () => media.removeEventListener?.("change", handleSystemTheme);
  }, []);

  const hasChanges =
    hydrated && JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const updateSetting = useCallback((section, key, value) => {
    setSettings((current) => {
      const updated = {
        ...current,
        [section]: { ...current[section], [key]: value },
      };

      if (section === "appearance" && key === "theme") {
        publishTheme(value);
      }

      return updated;
    });
    setNotice(null);
  }, []);

  const saveSettings = useCallback(() => {
    if (!hydrated || saving) return;
    setSaving(true);
    setNotice(null);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedSettings(clone(settings));
      publishTheme(settings.appearance.theme);
      setNotice({
        type: "success",
        message: "Your preferences have been saved in this browser.",
      });
    } catch {
      setNotice({
        type: "error",
        message:
          "Unable to save settings. Check your browser storage and try again.",
      });
    } finally {
      setSaving(false);
    }
  }, [hydrated, saving, settings]);

  const discardChanges = useCallback(() => {
    setSettings(clone(savedSettings));
    publishTheme(savedSettings.appearance.theme);
    setNotice({
      type: "info",
      message: "Unsaved changes have been discarded.",
    });
  }, [savedSettings]);

  const current = settings[activeSection];
  const section = SECTIONS.find((item) => item.id === activeSection);

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-slate-500">
        <LoaderCircle className="animate-spin text-[#176B48]" size={20} />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="admin-settings-page min-h-full bg-[#F7F9F7]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/admin" className="hover:text-[#176B48]">
                Admin
              </Link>
              <ChevronRight size={14} />
              <span className="text-slate-800">Settings</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#103C2A] sm:text-3xl">
              Settings
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
              Manage your Kaduna Explorer workspace preferences.
            </p>
          </div>

          <Link
            href="/"
            target="_blank"
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-[#176B48]"
          >
            <ExternalLink size={16} />
            Visit website
          </Link>
        </div>

        {notice && (
          <div className="mb-6">
            <Notice type={notice.type}>{notice.message}</Notice>
          </div>
        )}

        <div className="mb-6">
          <Notice>
            These settings are stored in this browser. Publishing rules, review
            moderation, and server security still require backend support.
          </Notice>
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[285px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-6">
            <p className="px-3 pb-3 pt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Settings menu
            </p>
            <nav
              aria-label="Settings sections"
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1"
            >
              {SECTIONS.map((item) => {
                const Icon = item.icon;
                const selected = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      setNotice(null);
                    }}
                    aria-current={selected ? "page" : undefined}
                    className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition sm:px-4 ${
                      selected
                        ? "bg-[#103C2A] text-white shadow-sm"
                        : "text-slate-600 hover:bg-[#176B48]/[0.06] hover:text-[#176B48]"
                    }`}
                  >
                    <Icon size={19} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {item.label}
                    </span>
                    {selected && <ChevronRight size={16} />}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 space-y-6">
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFBD4A]/20 text-[#103C2A]">
                  {section && <section.icon size={23} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#103C2A]">
                    {section?.label}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {section?.description}
                  </p>
                </div>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${hasChanges ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}
              >
                {hasChanges ? "Unsaved changes" : "All changes saved"}
              </span>
            </div>

            {activeSection === "general" && (
              <>
                <Card
                  title="Website identity"
                  description="Edit your website details and contact information."
                  icon={Globe}
                >
                  <div className="grid grid-cols-1 gap-5 py-6 sm:grid-cols-2">
                    <Field label="Website name">
                      <Input
                        value={current.siteName}
                        onChange={(v) =>
                          updateSetting("general", "siteName", v)
                        }
                      />
                    </Field>
                    <Field label="Tagline">
                      <Input
                        value={current.tagline}
                        onChange={(v) => updateSetting("general", "tagline", v)}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Website description">
                        <Textarea
                          value={current.siteDescription}
                          onChange={(v) =>
                            updateSetting("general", "siteDescription", v)
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Website URL">
                      <Input
                        type="url"
                        value={current.websiteUrl}
                        onChange={(v) =>
                          updateSetting("general", "websiteUrl", v)
                        }
                      />
                    </Field>
                    <Field label="Contact email">
                      <Input
                        type="email"
                        value={current.contactEmail}
                        onChange={(v) =>
                          updateSetting("general", "contactEmail", v)
                        }
                        placeholder="hello@example.com"
                      />
                    </Field>
                    <Field label="Contact phone">
                      <Input
                        value={current.contactPhone}
                        onChange={(v) =>
                          updateSetting("general", "contactPhone", v)
                        }
                        placeholder="+234..."
                      />
                    </Field>
                    <Field label="Business address">
                      <Input
                        value={current.siteAddress}
                        onChange={(v) =>
                          updateSetting("general", "siteAddress", v)
                        }
                      />
                    </Field>
                  </div>
                </Card>
                <Card title="Website preferences" icon={Settings2}>
                  <SettingRow
                    title="Show contact information"
                    description="Preference for showing contact details in connected components."
                    checked={current.showContactInformation}
                    onChange={(v) =>
                      updateSetting("general", "showContactInformation", v)
                    }
                    icon={Globe}
                  />
                  <SettingRow
                    title="Maintenance mode preference"
                    description="This does not take the public website offline."
                    checked={current.maintenanceMode}
                    onChange={(v) =>
                      updateSetting("general", "maintenanceMode", v)
                    }
                    icon={LockKeyhole}
                  />
                </Card>
              </>
            )}

            {activeSection === "destinations" && (
              <>
                <Card
                  title="Destination publishing"
                  description="Choose your preferred destination workflow."
                  icon={MapPin}
                >
                  <SettingRow
                    title="Allow destination submissions"
                    description="Preference for accepting new submissions."
                    checked={current.allowSubmissions}
                    onChange={(v) =>
                      updateSetting("destinations", "allowSubmissions", v)
                    }
                    icon={MapPin}
                  />
                  <SettingRow
                    title="Require approval before publishing"
                    description="Prefer manual review before a destination becomes public."
                    checked={current.requireApproval}
                    onChange={(v) =>
                      updateSetting("destinations", "requireApproval", v)
                    }
                    icon={ShieldCheck}
                  />
                  <SettingRow
                    title="Automatically publish destinations"
                    description="The backend must enforce actual publishing rules."
                    checked={current.autoPublish}
                    onChange={(v) =>
                      updateSetting("destinations", "autoPublish", v)
                    }
                    icon={Globe}
                  />
                  <SettingRow
                    title="Require destination images"
                    description="Preference for destinations to include images."
                    checked={current.requireImages}
                    onChange={(v) =>
                      updateSetting("destinations", "requireImages", v)
                    }
                    icon={ImageIcon}
                  />
                  <SettingRow
                    title="Show unpublished destinations in admin"
                    description="Preference for including drafts in admin views."
                    checked={current.showUnpublishedInAdmin}
                    onChange={(v) =>
                      updateSetting("destinations", "showUnpublishedInAdmin", v)
                    }
                    icon={MapPin}
                  />
                </Card>
                <Card
                  title="Image and pricing defaults"
                  description="Preferred values for destination forms."
                  icon={ImageIcon}
                >
                  <div className="grid grid-cols-1 gap-5 py-6 sm:grid-cols-2">
                    <Field
                      label="Maximum images"
                      hint="Does not override backend upload limits."
                    >
                      <Input
                        type="number"
                        value={current.maximumImages}
                        onChange={(v) =>
                          updateSetting(
                            "destinations",
                            "maximumImages",
                            Math.min(10, Math.max(1, Number(v) || 1)),
                          )
                        }
                      />
                    </Field>
                    <Field
                      label="Maximum image size (MB)"
                      hint="The server must validate uploaded files independently."
                    >
                      <Input
                        type="number"
                        value={current.maximumImageSize}
                        onChange={(v) =>
                          updateSetting(
                            "destinations",
                            "maximumImageSize",
                            Math.min(20, Math.max(1, Number(v) || 1)),
                          )
                        }
                      />
                    </Field>
                    <Field label="Default price level">
                      <Select
                        value={current.defaultPriceLevel}
                        onChange={(v) =>
                          updateSetting("destinations", "defaultPriceLevel", v)
                        }
                        options={[
                          { value: "unknown", label: "Not specified" },
                          { value: "free", label: "Free" },
                          { value: "budget", label: "Budget-friendly" },
                          { value: "moderate", label: "Moderate" },
                          { value: "expensive", label: "Expensive" },
                        ]}
                      />
                    </Field>
                  </div>
                </Card>
                <Notice type="warning">
                  These values do not change destination forms or server
                  publishing rules until connected to those features.
                </Notice>
              </>
            )}

            {activeSection === "reviews" && (
              <Card
                title="Review preferences"
                description="Choose your preferred review workflow."
                icon={Star}
              >
                <SettingRow
                  title="Allow reviews"
                  description="Preferred policy for accepting reviews."
                  checked={current.allowReviews}
                  onChange={(v) => updateSetting("reviews", "allowReviews", v)}
                  icon={Star}
                />
                <SettingRow
                  title="Require review moderation"
                  description="Prefer reviewing new submissions before displaying them."
                  checked={current.requireModeration}
                  onChange={(v) =>
                    updateSetting("reviews", "requireModeration", v)
                  }
                  icon={ShieldCheck}
                />
                <SettingRow
                  title="Allow guest reviews"
                  description="Preference for reviews from visitors without an account."
                  checked={current.allowGuestReviews}
                  onChange={(v) =>
                    updateSetting("reviews", "allowGuestReviews", v)
                  }
                  icon={Users}
                />
                <SettingRow
                  title="Display ratings"
                  description="Preference for displaying rating information."
                  checked={current.showRatings}
                  onChange={(v) => updateSetting("reviews", "showRatings", v)}
                  icon={Star}
                />
                <SettingRow
                  title="Allow review editing"
                  description="Preferred policy for authors editing their reviews."
                  checked={current.allowReviewEditing}
                  onChange={(v) =>
                    updateSetting("reviews", "allowReviewEditing", v)
                  }
                  icon={Settings2}
                />
                <SettingRow
                  title="Notify about new reviews"
                  description="Save a preference for new review alerts."
                  checked={current.notifyOnNewReview}
                  onChange={(v) =>
                    updateSetting("reviews", "notifyOnNewReview", v)
                  }
                  icon={Bell}
                />
              </Card>
            )}

            {activeSection === "notifications" && (
              <Card
                title="Notification preferences"
                description="Choose which events you want your workspace to track."
                icon={Bell}
              >
                <SettingRow
                  title="New destination"
                  description="Preference for destination submission alerts."
                  checked={current.newDestination}
                  onChange={(v) =>
                    updateSetting("notifications", "newDestination", v)
                  }
                  icon={MapPin}
                />
                <SettingRow
                  title="New review"
                  description="Preference for review alerts."
                  checked={current.newReview}
                  onChange={(v) =>
                    updateSetting("notifications", "newReview", v)
                  }
                  icon={Star}
                />
                <SettingRow
                  title="New user registration"
                  description="Preference for new account alerts."
                  checked={current.newUser}
                  onChange={(v) => updateSetting("notifications", "newUser", v)}
                  icon={Users}
                />
                <SettingRow
                  title="Moderation required"
                  description="Preference for content moderation alerts."
                  checked={current.moderationRequired}
                  onChange={(v) =>
                    updateSetting("notifications", "moderationRequired", v)
                  }
                  icon={ShieldCheck}
                />
                <SettingRow
                  title="System alerts"
                  description="Preference for important system notices."
                  checked={current.systemAlerts}
                  onChange={(v) =>
                    updateSetting("notifications", "systemAlerts", v)
                  }
                  icon={Info}
                />
                <SettingRow
                  title="Email notifications"
                  description="Requires a configured backend notification service."
                  checked={current.emailNotifications}
                  onChange={(v) =>
                    updateSetting("notifications", "emailNotifications", v)
                  }
                  icon={Bell}
                />
                <SettingRow
                  title="Browser notifications"
                  description="Actual delivery also requires browser permission and notification code."
                  checked={current.browserNotifications}
                  onChange={(v) =>
                    updateSetting("notifications", "browserNotifications", v)
                  }
                  icon={Globe}
                />
              </Card>
            )}

            {activeSection === "appearance" && (
              <>
                <Card
                  title="Workspace theme"
                  description="Choose a theme. It applies immediately throughout the admin workspace."
                  icon={Palette}
                >
                  <div className="grid grid-cols-1 gap-3 py-6 sm:grid-cols-3">
                    {[
                      {
                        value: "light",
                        label: "Light",
                        description: "Bright workspace",
                        icon: Sun,
                      },
                      {
                        value: "dark",
                        label: "Dark",
                        description: "Dark workspace",
                        icon: Moon,
                      },
                      {
                        value: "system",
                        label: "System",
                        description: "Follow device preference",
                        icon: Monitor,
                      },
                    ].map((option) => {
                      const Icon = option.icon;
                      const selected = current.theme === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            updateSetting("appearance", "theme", option.value)
                          }
                          aria-pressed={selected}
                          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                            selected
                              ? "border-[#176B48] bg-[#176B48]/[0.05] ring-2 ring-[#176B48]/10"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-[#103C2A] text-white" : "bg-slate-100 text-slate-600"}`}
                          >
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800">
                              {option.label}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {option.description}
                            </p>
                          </div>
                          {selected && (
                            <CheckCircle2
                              size={17}
                              className="shrink-0 text-[#176B48]"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Card>
                <Card
                  title="Interface preferences"
                  description="Customize your admin layout."
                  icon={Monitor}
                >
                  <SettingRow
                    title="Compact mode"
                    description="Preference for a denser administration layout."
                    checked={current.compactMode}
                    onChange={(v) =>
                      updateSetting("appearance", "compactMode", v)
                    }
                    icon={SlidersHorizontal}
                  />
                  <SettingRow
                    title="Show animations"
                    description="Preference for interface motion and transitions."
                    checked={current.showAnimations}
                    onChange={(v) =>
                      updateSetting("appearance", "showAnimations", v)
                    }
                    icon={Palette}
                  />
                  <SettingRow
                    title="Collapsed sidebar"
                    description="Preference for a compact navigation sidebar."
                    checked={current.sidebarCollapsed}
                    onChange={(v) =>
                      updateSetting("appearance", "sidebarCollapsed", v)
                    }
                    icon={Settings2}
                  />
                  <SettingRow
                    title="Dashboard charts"
                    description="Preference for displaying dashboard charts."
                    checked={current.dashboardCharts}
                    onChange={(v) =>
                      updateSetting("appearance", "dashboardCharts", v)
                    }
                    icon={SlidersHorizontal}
                  />
                  <SettingRow
                    title="Welcome message"
                    description="Preference for a dashboard welcome message."
                    checked={current.showWelcomeMessage}
                    onChange={(v) =>
                      updateSetting("appearance", "showWelcomeMessage", v)
                    }
                    icon={Globe}
                  />
                </Card>
                <Notice>
                  Theme changes apply immediately. The remaining layout
                  preferences will need to be connected to the sidebar and
                  dashboard components to change their behavior.
                </Notice>
              </>
            )}

            {activeSection === "security" && (
              <>
                <Card
                  title="Administrator security"
                  description="Manage browser-side security preferences."
                  icon={ShieldCheck}
                >
                  <SettingRow
                    title="Show security reminders"
                    description="Keep security guidance visible in the workspace."
                    checked={current.showSecurityNotice}
                    onChange={(v) =>
                      updateSetting("security", "showSecurityNotice", v)
                    }
                    icon={ShieldCheck}
                  />
                  <SettingRow
                    title="Confirm destructive actions"
                    description="Preference for confirmation dialogs before deletions."
                    checked={current.confirmDestructiveActions}
                    onChange={(v) =>
                      updateSetting("security", "confirmDestructiveActions", v)
                    }
                    icon={AlertTriangle}
                  />
                  <SettingRow
                    title="Warn before leaving unsaved work"
                    description="Individual forms must implement this behavior."
                    checked={current.warnBeforeLeaving}
                    onChange={(v) =>
                      updateSetting("security", "warnBeforeLeaving", v)
                    }
                    icon={Info}
                  />
                  <SettingRow
                    title="Session reminder"
                    description="Preference for session security reminders."
                    checked={current.sessionReminder}
                    onChange={(v) =>
                      updateSetting("security", "sessionReminder", v)
                    }
                    icon={LockKeyhole}
                  />
                </Card>
                <Card
                  title="Security status"
                  description="Security enforcement belongs on the server."
                  icon={LockKeyhole}
                >
                  <div className="space-y-4 py-5">
                    <p className="text-sm leading-6 text-slate-600">
                      Admin pages should check the signed-in user's role, and
                      every protected API endpoint must independently verify
                      permissions.
                    </p>
                    <p className="border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">
                      Login, logout, token validation, cookie security, and
                      session expiry depend on the authentication
                      implementation.
                    </p>
                    <p className="border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">
                      Password changes and two-factor authentication should only
                      be offered when verified backend endpoints support them.
                    </p>
                  </div>
                </Card>
                <Notice type="warning">
                  These switches save preferences only. They do not change
                  server permissions, passwords, or session expiry.
                </Notice>
              </>
            )}

            <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {hasChanges ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-slate-600">
                        You have unsaved changes.
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} className="text-emerald-600" />
                      <span className="text-slate-500">All changes saved.</span>
                    </>
                  )}
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={discardChanges}
                    disabled={!hasChanges || saving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw size={16} /> Discard changes
                  </button>
                  <button
                    type="button"
                    onClick={saveSettings}
                    disabled={!hasChanges || saving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#176B48] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
