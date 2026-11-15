"use client";

import Link from "next/link";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileEdit,
  Globe,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import OptimizedImage from "@/components/OptimizedImage";

import { apiRequest } from "@/lib/api";

const PAGE_SIZE = 9;

const FILTERS = [
  { value: "all", label: "All events" },

  { value: "published", label: "Published" },

  { value: "draft", label: "Drafts" },

  { value: "upcoming", label: "Upcoming" },

  { value: "live", label: "Live now" },

  { value: "ended", label: "Ended" },
];

const inputClass =
  "w-full rounded-xl border border-[#DFE6DC] bg-white px-3 py-2.5 text-xs text-[#18352A] outline-none transition placeholder:text-slate-400 focus:border-[#7EAC8A] focus:ring-4 focus:ring-[#176B48]/[0.07]";

function extractEvents(response) {
  const candidates = [response?.data?.events, response?.events];

  return candidates.find(Array.isArray) || [];
}

function getId(event) {
  return event?._id || event?.id || "";
}

function getCoverImage(event) {
  const coverImage = event?.coverImage;
  if (typeof coverImage === "string") return coverImage;
  if (coverImage && typeof coverImage === "object") {
    return typeof coverImage.url === "string" ? coverImage.url : "";
  }
  return "";
}

function getLifecycleStatus(event) {
  const start = new Date(event?.startDate).getTime();

  const end = new Date(event?.endDate).getTime();

  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return "unknown";
  }

  if (now > end) return "ended";

  if (now >= start) return "live";

  return "upcoming";
}

function formatDate(value, includeTime = false) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",

    month: "short",

    year: "numeric",

    ...(includeTime
      ? {
          hour: "numeric",

          minute: "2-digit",
        }
      : {}),
  }).format(date);
}

function toDisplayText(value, fallback = "") {
  if (value instanceof RegExp) return value.source || fallback;

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";

  return fallback;
}

function getCategory(event) {
  return toDisplayText(event?.categoryLabel || event?.category, "Uncategorised")
    .replaceAll("-", " ")

    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function StatusBadge({ event }) {
  if (!event.isPublished) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-700 sm:px-2.5 sm:py-1.5 sm:text-[10px]">
        Draft
      </span>
    );
  }

  const status = getLifecycleStatus(event);

  const styles = {
    live: "bg-emerald-50 text-emerald-700",

    upcoming: "bg-blue-50 text-blue-700",

    ended: "bg-slate-100 text-slate-600",

    unknown: "bg-slate-100 text-slate-600",
  };

  const labels = {
    live: "Live now",

    upcoming: "Upcoming",

    ended: "Ended",

    unknown: "Published",
  };

  return (
    <span
      className={`rounded-full px-2 py-1 text-[8px] font-bold sm:px-2.5 sm:py-1.5 sm:text-[10px] ${
        styles[status] || styles.unknown
      }`}
    >
      {labels[status] || "Published"}
    </span>
  );
}

function StatCard({ label, value, description, icon: Icon, tone }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",

    blue: "bg-blue-50 text-blue-700",

    amber: "bg-amber-50 text-amber-700",

    orange: "bg-orange-50 text-orange-700",

    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <article className="rounded-2xl border border-[#E7EAE3] bg-white p-4 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#103C2A]/[0.05] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-2xl font-extrabold text-[#103C2A] sm:text-3xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            tones[tone] || tones.green
          }`}
        >
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-3 text-[10px] text-slate-400 sm:text-xs">
        {description}
      </p>
    </article>
  );
}

function EventCard({
  event,

  onDelete,

  onTogglePublish,

  onToggleFeatured,

  busy,

  publishBusy,

  featuredBusy,
}) {
  const id = getId(event);

  const image = getCoverImage(event);

  const published = Boolean(event.isPublished);

  const featured = Boolean(event.isFeatured);

  const isEnded = published && getLifecycleStatus(event) === "ended";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#E7EAE3] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#103C2A]/[0.07]">
      <div className={isEnded ? "select-none blur-[3px]" : ""}>
        <div className="relative h-20 overflow-hidden bg-[#EDF2EA] sm:h-28 lg:h-32">
          {image ? (
            <OptimizedImage
              src={image}
              alt={toDisplayText(event.title, "Event cover")}
              fill
              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 25vw"
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[#91A493]">
              <CalendarDays size={34} />

              <span className="text-xs font-semibold">No cover image</span>
            </div>
          )}

          <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3 sm:gap-3">
            <div className="min-w-0 max-w-[calc(50%-0.25rem)] shrink-0">
              <StatusBadge event={event} />
            </div>

            <div className="min-w-0 max-w-[calc(50%-0.25rem)] truncate rounded-lg bg-white/95 px-2 py-1 text-[8px] font-bold text-[#294638] shadow-sm sm:px-2.5 sm:py-1.5 sm:text-[10px]">
              <span className="block truncate">{getCategory(event)}</span>
            </div>
          </div>
        </div>

        <div className="p-2 sm:p-3 lg:p-3.5">
          <h3 className="line-clamp-2 min-h-0 text-[10px] font-extrabold leading-4 text-[#103C2A] sm:min-h-9 sm:text-sm sm:leading-5">
            {toDisplayText(event.title, "Untitled event")}
          </h3>

          <p className="hidden sm:mt-1.5 sm:line-clamp-2 sm:block sm:min-h-8 sm:text-[11px] sm:leading-4 sm:text-slate-500">
            {toDisplayText(
              event.shortDescription || event.description,

              "No event description has been added.",
            )}
          </p>

          <div className="mt-2 space-y-1.5 border-t border-[#EEF0EA] pt-2 sm:mt-3 sm:space-y-2 sm:pt-3">
            <div className="flex min-w-0 items-center gap-1.5 text-[9px] leading-[14px] text-slate-500 sm:gap-2 sm:text-xs sm:leading-4">
              <CalendarDays
                size={12}
                className="shrink-0 text-[#719175] sm:h-[14px] sm:w-[14px]"
              />

              <span>{formatDate(event.startDate, true)}</span>
            </div>

            <div className="flex min-w-0 items-center gap-1.5 text-[9px] leading-[14px] text-slate-500 sm:gap-2 sm:text-xs sm:leading-4">
              <Clock3
                size={12}
                className="shrink-0 text-[#719175] sm:h-[14px] sm:w-[14px]"
              />

              <span>Ends {formatDate(event.endDate, true)}</span>
            </div>

            <div className="flex min-w-0 items-center gap-1.5 text-[9px] leading-[14px] text-slate-500 sm:gap-2 sm:text-xs sm:leading-4">
              <MapPin
                size={12}
                className="shrink-0 text-[#719175] sm:h-[14px] sm:w-[14px]"
              />

              <span className="hidden truncate sm:inline">
                {[event.venue, event.city, event.lga]

                  .filter(Boolean)

                  .join(", ") || "Venue not provided"}
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-[#EEF0EA] pt-2 sm:mt-3 sm:justify-between sm:pt-2.5">
            <span className="hidden text-[10px] text-slate-400 sm:block">
              Added {formatDate(event.createdAt)}
            </span>

            <div className="flex items-center gap-1.5">
              {event.slug && (
                <Link
                  href={`/events/${encodeURIComponent(event.slug)}`}
                  target="_blank"
                  title="Preview event"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE6D8] text-[#176B48] transition hover:bg-[#EDF4E9] sm:h-9 sm:w-9"
                >
                  <Eye size={15} />
                </Link>
              )}

              <Link
                href={`/admin/events/${encodeURIComponent(id)}/edit`}
                title="Edit event"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE6D8] text-[#176B48] transition hover:bg-[#EDF4E9] sm:h-9 sm:w-9"
              >
                <Pencil size={15} />
              </Link>

              <button
                type="button"
                onClick={() => onDelete(event)}
                disabled={busy}
                title="Delete event"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:h-9 sm:w-9"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-stretch gap-2 px-1 sm:mt-2.5 sm:gap-3 sm:px-1">
            <button
              type="button"
              onClick={() => onTogglePublish(event)}
              disabled={publishBusy}
              className={`flex min-h-8 min-w-0 flex-1 basis-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[9px] font-bold transition disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 sm:rounded-xl sm:px-2 sm:py-2 sm:text-xs ${
                published
                  ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "bg-[#103C2A] text-white hover:bg-[#176B48]"
              }`}
            >
              {publishBusy ? (
                <LoaderCircle
                  size={12}
                  className="shrink-0 animate-spin sm:h-[15px] sm:w-[15px]"
                />
              ) : published ? (
                <FileEdit
                  size={10}
                  className="shrink-0 sm:h-[15px] sm:w-[15px]"
                />
              ) : (
                <Globe size={10} className="shrink-0 sm:h-[15px] sm:w-[15px]" />
              )}

              <span className="whitespace-nowrap text-[9px] leading-none sm:hidden">
                {published ? "Unpublish" : "Publish"}
              </span>

              <span className="hidden whitespace-nowrap text-xs leading-none sm:inline">
                {published ? "Unpublish event" : "Publish event"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleFeatured(event)}
              disabled={featuredBusy}
              aria-pressed={featured}
              aria-label={
                featured
                  ? "Remove event from featured experiences"
                  : "Feature this event"
              }
              title={
                featured
                  ? "Remove from featured experiences"
                  : "Feature this event"
              }
              className={`inline-flex min-h-8 min-w-0 flex-1 basis-0 items-center justify-center gap-1 rounded-lg border px-1 py-1.5 text-[9px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 sm:rounded-xl sm:px-2 sm:py-2 sm:text-[10px] ${
                featured
                  ? "border-amber-300 bg-amber-100 text-amber-800 shadow-sm hover:bg-amber-200"
                  : "border-[#DCE6D8] bg-white text-[#55705E] hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
              }`}
            >
              {featuredBusy ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Star
                  size={10}
                  className={`shrink-0 ${featured ? "fill-current" : ""}`}
                />
              )}

              <span className="whitespace-nowrap text-[9px] leading-none sm:text-[10px]">
                {featured ? "Featured" : "Feature"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {isEnded && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/35 px-4 backdrop-blur-[1px]"
        >
          <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/95 px-3 py-2 text-[11px] font-extrabold leading-tight text-[#52645A] shadow-lg shadow-[#103C2A]/10 sm:gap-2.5 sm:px-5 sm:py-3 sm:text-sm">
            <CalendarX
              size={14}
              className="shrink-0 text-[#8A9690] sm:h-[17px] sm:w-[17px]"
            />

            <span>Event has ended</span>
          </div>

          <Link
            href={`/admin/events/${encodeURIComponent(id)}/edit`}
            className="pointer-events-auto absolute bottom-3 left-1/2 inline-flex min-h-8 -translate-x-1/2 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-300 bg-amber-100 px-3 py-1.5 text-[10px] font-extrabold sm:min-h-9 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs text-amber-800 shadow-md transition hover:bg-amber-200"
          >
            <Pencil size={13} />
            Open to edit
          </Link>
        </div>
      )}
    </article>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D6E1D1] bg-white px-5 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EDF4E9] text-[#176B48]">
        <CalendarDays size={26} />
      </div>

      <h3 className="mt-4 text-base font-extrabold text-[#103C2A]">
        {hasFilters ? "No matching events" : "No events created yet"}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-6 text-slate-500">
        {hasFilters
          ? "Try changing your search or selecting another filter."
          : "Your events will appear here after you create your first event."}
      </p>

      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-xl border border-[#DCE6D8] px-4 py-2.5 text-xs font-bold text-[#176B48] hover:bg-[#F5F8F2]"
        >
          Clear filters
        </button>
      ) : (
        <Link
          href="/admin/events/new"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#103C2A] px-4 py-3 text-xs font-bold text-white hover:bg-[#176B48]"
        >
          <Plus size={15} />
          Create your first event
        </Link>
      )}
    </div>
  );
}

function DeleteDialog({ event, onCancel, onConfirm, deleting }) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-event-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Trash2 size={22} />
        </div>

        <h2
          id="delete-event-title"
          className="mt-4 text-lg font-extrabold text-[#103C2A]"
        >
          Delete this event?
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          You are about to permanently delete{" "}
          <strong className="text-slate-700">
            {toDisplayText(event.title, "this event")}
          </strong>
          . This action cannot be undone.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting && <LoaderCircle size={15} className="animate-spin" />}

            {deleting ? "Deleting..." : "Delete event"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");

  const [activeFilter, setActiveFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [actionId, setActionId] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [deleting, setDeleting] = useState(false);

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await apiRequest("events/admin");

      setEvents(extractEvents(response));
    } catch (requestError) {
      setError(
        requestError?.message || "Unable to load events. Please try again.",
      );
    } finally {
      setLoading(false);

      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const stats = useMemo(() => {
    const published = events.filter((event) => event.isPublished);

    const drafts = events.filter((event) => !event.isPublished);

    return {
      total: events.length,

      published: published.length,

      drafts: drafts.length,

      upcoming: published.filter(
        (event) => getLifecycleStatus(event) === "upcoming",
      ).length,

      live: published.filter((event) => getLifecycleStatus(event) === "live")
        .length,

      ended: published.filter((event) => getLifecycleStatus(event) === "ended")
        .length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return events.filter((event) => {
      const lifecycle = getLifecycleStatus(event);

      const matchesSearch =
        !term ||
        [
          event.title,

          event.description,

          event.category,

          event.categoryLabel,

          event.venue,

          event.address,

          event.city,

          event.lga,

          event.slug,
        ]

          .filter(Boolean)

          .some((value) => String(value).toLowerCase().includes(term));

      let matchesFilter = true;

      switch (activeFilter) {
        case "published":
          matchesFilter = Boolean(event.isPublished);

          break;

        case "draft":
          matchesFilter = !event.isPublished;

          break;

        case "upcoming":
          matchesFilter =
            Boolean(event.isPublished) && lifecycle === "upcoming";

          break;

        case "live":
          matchesFilter = Boolean(event.isPublished) && lifecycle === "live";

          break;

        case "ended":
          matchesFilter = Boolean(event.isPublished) && lifecycle === "ended";

          break;

        default:
          matchesFilter = true;
      }

      return matchesSearch && matchesFilter;
    });
  }, [events, search, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));

  const visibleEvents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredEvents.slice(start, start + PAGE_SIZE);
  }, [filteredEvents, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleTogglePublish = async (event) => {
    const id = getId(event);

    const actionKey = `${id}:publish`;

    if (!id || actionId[actionKey]) return;

    const nextState = !event.isPublished;

    setActionId((previous) => ({ ...previous, [actionKey]: true }));

    setError("");

    setNotice("");

    try {
      await apiRequest(`events/${encodeURIComponent(id)}`, {
        method: "PATCH",

        body: {
          isPublished: nextState,
        },
      });

      setEvents((previous) =>
        previous.map((item) =>
          getId(item) === id ? { ...item, isPublished: nextState } : item,
        ),
      );

      setNotice(
        nextState
          ? "Event published successfully."
          : "Event unpublished successfully.",
      );
    } catch (requestError) {
      setError(
        requestError?.message || "Unable to update the publication status.",
      );
    } finally {
      setActionId((previous) => {
        const next = { ...previous };

        delete next[actionKey];

        return next;
      });
    }
  };

  const handleToggleFeatured = async (event) => {
    const id = getId(event);

    const actionKey = `${id}:featured`;

    if (!id || actionId[actionKey]) return;

    const nextState = !Boolean(event.isFeatured);

    setActionId((previous) => ({ ...previous, [actionKey]: true }));

    setError("");

    setNotice("");

    try {
      await apiRequest(`events/${encodeURIComponent(id)}`, {
        method: "PATCH",

        body: {
          isFeatured: nextState,
        },
      });

      setEvents((previous) =>
        previous.map((item) =>
          getId(item) === id ? { ...item, isFeatured: nextState } : item,
        ),
      );

      setNotice(
        nextState
          ? "Event added to featured experiences."
          : "Event removed from featured experiences.",
      );
    } catch (requestError) {
      setError(
        requestError?.message || "Unable to update the featured status.",
      );
    } finally {
      setActionId((previous) => {
        const next = { ...previous };

        delete next[actionKey];

        return next;
      });
    }
  };

  const handleDelete = async () => {
    const id = getId(deleteTarget);

    if (!id || deleting) return;

    setDeleting(true);

    setError("");

    setNotice("");

    try {
      await apiRequest(`events/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      setEvents((previous) => previous.filter((event) => getId(event) !== id));

      setDeleteTarget(null);

      setNotice("Event deleted successfully.");
    } catch (requestError) {
      setError(requestError?.message || "Unable to delete this event.");
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");

    setActiveFilter("all");

    setCurrentPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-10">
      {/* INTRODUCTION */}

      <section className="relative overflow-hidden rounded-2xl bg-[#103C2A] px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8 lg:px-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[35px] border-white/[0.035]" />

        <div className="pointer-events-none absolute -bottom-28 right-[20%] h-64 w-64 rounded-full border-[30px] border-[#FFBD4A]/[0.07]" />

        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFBD4A]">
              <CalendarDays size={13} />
              Event management
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Manage your events
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-6 text-white/65 sm:text-sm">
              Create, organise and publish events happening across Kaduna State.
              Keep your event listings accurate and up to date.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadEvents(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-4 py-3 text-xs font-bold text-white transition hover:bg-white/[0.15] disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <Link
              href="/admin/events/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFBD4A] px-4 py-3 text-xs font-extrabold text-[#103C2A] transition hover:-translate-y-0.5 hover:bg-[#FFD17C]"
            >
              <Plus size={16} />
              Create event
            </Link>
          </div>
        </div>
      </section>

      {/* NOTIFICATIONS */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />

          <span className="flex-1 leading-5">{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700"
        >
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />

          <span className="flex-1 leading-5">{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-extrabold text-[#103C2A]">
            Events overview
          </h2>

          <p className="mt-1 text-[10px] text-slate-400">
            Statistics calculated from your event records
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[120px] animate-pulse rounded-2xl border border-[#E7EAE3] bg-white"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Total events"
              value={stats.total}
              description="All event records"
              icon={CalendarDays}
              tone="green"
            />

            <StatCard
              label="Published"
              value={stats.published}
              description="Visible on the public site"
              icon={Globe}
              tone="blue"
            />

            <StatCard
              label="Drafts"
              value={stats.drafts}
              description="Not publicly visible"
              icon={FileEdit}
              tone="amber"
            />

            <StatCard
              label="Upcoming"
              value={stats.upcoming}
              description="Published future events"
              icon={CalendarCheck}
              tone="orange"
            />

            <StatCard
              label="Live now"
              value={stats.live}
              description="Events currently in progress"
              icon={Radio}
              tone="green"
            />

            <StatCard
              label="Ended"
              value={stats.ended}
              description="Published events that ended"
              icon={CalendarX}
              tone="slate"
            />
          </div>
        )}
      </section>

      {/* EVENTS LIST */}

      <section className="overflow-hidden rounded-2xl border border-[#E7EAE3] bg-white">
        <div className="border-b border-[#EEF0EA] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-sm font-extrabold text-[#103C2A]">
                All events
              </h2>

              <p className="mt-1 text-[10px] text-slate-400">
                {loading
                  ? "Loading event records..."
                  : `${filteredEvents.length} events found`}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search events..."
                  aria-label="Search events"
                  className={inputClass + " pl-9"}
                />
              </div>

              <Link
                href="/admin/events/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#176B48]"
              >
                <Plus size={15} />
                Add event
              </Link>
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                aria-pressed={activeFilter === filter.value}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[10px] font-bold transition sm:text-xs ${
                  activeFilter === filter.value
                    ? "bg-[#103C2A] text-white"
                    : "border border-[#E5EAE2] bg-white text-slate-500 hover:border-[#B9CCB8] hover:text-[#176B48]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 items-stretch justify-between gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[390px] animate-pulse rounded-2xl bg-[#F2F5F0]"
              />
            ))}
          </div>
        ) : visibleEvents.length > 0 ? (
          <>
            <div className="grid grid-cols-2 items-stretch justify-between gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 xl:grid-cols-4">
              {visibleEvents.map((event) => (
                <EventCard
                  key={getId(event)}
                  event={event}
                  onDelete={setDeleteTarget}
                  onTogglePublish={handleTogglePublish}
                  onToggleFeatured={handleToggleFeatured}
                  busy={Boolean(
                    actionId[`${getId(event)}:publish`] ||
                    actionId[`${getId(event)}:featured`],
                  )}
                  publishBusy={Boolean(actionId[`${getId(event)}:publish`])}
                  featuredBusy={Boolean(actionId[`${getId(event)}:featured`])}
                />
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#EEF0EA] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="hidden text-[10px] text-slate-400 sm:block">
                Showing{" "}
                {Math.min(
                  (currentPage - 1) * PAGE_SIZE + 1,

                  filteredEvents.length,
                )}{" "}
                to {Math.min(currentPage * PAGE_SIZE, filteredEvents.length)} of{" "}
                {filteredEvents.length} events
              </p>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage <= 1}
                  className="flex h-9 items-center gap-1 rounded-lg border border-[#E2E8DE] px-3 text-xs font-semibold text-slate-600 transition hover:bg-[#F5F8F2] disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>

                <span className="px-2 text-[10px] font-semibold text-slate-500">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="flex h-9 items-center gap-1 rounded-lg border border-[#E2E8DE] px-3 text-xs font-semibold text-slate-600 transition hover:bg-[#F5F8F2] disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-3 sm:p-5">
            <EmptyState
              hasFilters={Boolean(search.trim()) || activeFilter !== "all"}
              onClear={clearFilters}
            />
          </div>
        )}
      </section>

      {/* DELETE CONFIRMATION */}

      <DeleteDialog
        event={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
