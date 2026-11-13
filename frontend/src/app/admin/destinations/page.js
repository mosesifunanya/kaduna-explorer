"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Grid2X2,
  List,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

const PAGE_SIZE = 12;

const CATEGORIES = [
  ["all", "All categories"],
  ["attraction", "Tourist"],
  ["restaurant", "Restaurant"],
  ["hotel", "Hotel"],
  ["cafe", "Cafe"],
  ["park", "Park and garden"],
  ["nature", "Nature and wildlife"],
  ["culture", "Culture and heritage"],
  ["historical-site", "Historical site"],
  ["shopping", "Shopping centre and mall"],
  ["market", "Market and local shopping"],
  ["entertainment", "Entertainment"],
  ["sports", "Sports and recreation"],
  ["event", "Event and festival"],
  ["nightlife", "Nightlife"],
  ["hospital", "Hospital"],
  ["clinic", "Clinic and medical centre"],
  ["pharmacy", "Pharmacy"],
  ["school", "School and educational institution"],
  ["university", "University and college"],
  ["religious-site", "Religious site"],
  ["mosque", "Mosque"],
  ["church", "Church"],
  ["government-office", "Government office"],
  ["police-station", "Police station"],
  ["bank", "Bank and ATM"],
  ["transport", "Transport terminal"],
  ["airport", "Airport"],
  ["hotel-service", "Guest house and accommodation"],
  ["fuel-station", "Fuel station"],
  ["conference-centre", "Conference and event centre"],
  ["museum", "Museum and gallery"],
  ["library", "Library"],
  ["farm", "Farm and agricultural tourism"],
  ["waterfall", "Waterfall and water attraction"],
  ["viewpoint", "Scenic viewpoint"],
  ["service", "Other service"],
  ["other", "Other"],
];

const inputClass =
  "w-full min-w-0 rounded-xl border border-[#DFE6DC] bg-white px-3 py-2.5 text-xs text-[#18352A] outline-none transition placeholder:text-slate-400 focus:border-[#7EAC8A] focus:ring-4 focus:ring-[#176B48]/[0.07] sm:px-3.5 sm:text-sm";

function extractDestinations(response) {
  const candidates = [
    response?.data?.destinations,
    response?.data?.data?.destinations,
    response?.destinations,
    response?.data,
  ];

  return candidates.find(Array.isArray) || [];
}

function getId(destination) {
  return destination?._id || destination?.id || "";
}

function getCoverImage(destination) {
  const cover = destination?.coverImage;

  if (typeof cover === "string" && cover) return cover;
  if (cover?.url) return cover.url;
  if (cover?.secure_url) return cover.secure_url;

  const firstImage = destination?.images?.[0];

  if (typeof firstImage === "string") return firstImage;

  return firstImage?.url || firstImage?.secure_url || "";
}

function getCategoryLabel(destination) {
  if (destination?.category === "other" && destination?.categoryLabel) {
    return destination.categoryLabel;
  }

  return (
    CATEGORIES.find(([value]) => value === destination?.category)?.[1] ||
    destination?.categoryLabel ||
    destination?.category ||
    "Uncategorised"
  );
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ published }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold sm:gap-1.5 sm:px-2.5 sm:text-[10px] ${
        published
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          published ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}

function DestinationImage({ destination, className = "" }) {
  const image = getCoverImage(destination);

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-[#F0F4EC] ${className}`}
    >
      {image ? (
        <img
          src={image}
          alt={destination?.name || "Destination"}
          className="block h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
      ) : (
        <div className="flex flex-col items-center gap-1.5 text-[#8AA08A]">
          <MapPin size={22} />
          <span className="text-center text-[9px] font-semibold sm:text-[10px]">
            No cover image
          </span>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D6E1D1] bg-white px-4 py-10 text-center sm:px-5 sm:py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDF4E9] text-[#176B48] sm:h-14 sm:w-14 sm:rounded-2xl">
        <MapPin size={23} />
      </div>

      <h3 className="mt-3 text-sm font-extrabold text-[#103C2A] sm:mt-4 sm:text-base">
        {hasFilters ? "No matching destinations" : "No destinations yet"}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-5 text-slate-500 sm:leading-6">
        {hasFilters
          ? "Try another search term or clear your filters."
          : "Add your first destination to start building the Kaduna Explorer directory."}
      </p>

      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-xl border border-[#DCE6D8] px-4 py-2.5 text-xs font-bold text-[#176B48] hover:bg-[#F5F8F2]"
        >
          Clear filters
        </button>
      ) : (
        <Link
          href="/admin/destinations/new"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#103C2A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#176B48]"
        >
          <Plus size={15} />
          Add destination
        </Link>
      )}
    </div>
  );
}

function DestinationActions({ destination, onDelete }) {
  const id = getId(destination);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        href={`/admin/destinations/${encodeURIComponent(id)}/edit`}
        aria-label={`Edit ${destination.name || "destination"}`}
        title="Edit destination"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE6D8] text-[#176B48] transition hover:bg-[#EDF4E9] sm:h-9 sm:w-9"
      >
        <Pencil size={14} />
      </Link>

      <button
        type="button"
        onClick={() => onDelete(destination)}
        aria-label={`Delete ${destination.name || "destination"}`}
        title="Delete destination"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 sm:h-9 sm:w-9"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function DestinationCard({ destination, onDelete }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-[#E4E8DF] bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#103C2A]/[0.06] sm:rounded-2xl">
      <div className="relative">
        <DestinationImage
          destination={destination}
          className="h-28 w-full sm:h-36 md:h-32 lg:h-36 xl:h-40"
        />

        <div className="absolute left-1.5 top-1.5 sm:left-2 sm:top-2">
          <StatusBadge published={Boolean(destination.isPublished)} />
        </div>

        <div className="absolute right-1.5 top-1.5 max-w-[62%] truncate rounded-md bg-white/95 px-1.5 py-1 text-[8px] font-bold text-[#294638] shadow-sm sm:right-2 sm:top-2 sm:px-2 sm:text-[10px]">
          {getCategoryLabel(destination)}
        </div>
      </div>

      <div className="min-w-0 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5 lg:px-3.5">
        <h3
          className="truncate text-xs font-extrabold leading-4 text-[#103C2A] sm:text-sm"
          title={destination.name || "Untitled destination"}
        >
          {destination.name || "Untitled destination"}
        </h3>

        <p className="mt-1.5 line-clamp-2 min-h-8 text-[10px] leading-4 text-slate-500 sm:mt-2 sm:min-h-10 sm:text-xs sm:leading-5">
          {destination.shortDescription ||
            "No short description has been added."}
        </p>

        <div className="mt-2 flex min-w-0 items-start gap-1.5 text-[9px] leading-4 text-slate-500 sm:mt-2.5 sm:gap-2 sm:text-[11px]">
          <MapPin
            size={12}
            className="mt-0.5 shrink-0 text-[#719175] sm:h-[14px] sm:w-[14px]"
          />

          <span className="line-clamp-2 min-w-0 break-words">
            {[destination.address, destination.city, destination.lga]
              .filter(Boolean)
              .join(", ") || "Location not provided"}
          </span>
        </div>

        <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-[#EDF0E9] pt-2">
          <p className="min-w-0 text-[9px] leading-4 text-slate-400 sm:text-[10px]">
            {formatDate(destination.createdAt)}
          </p>

          <DestinationActions destination={destination} onDelete={onDelete} />
        </div>
      </div>
    </article>
  );
}

function DestinationTable({ destinations, onDelete }) {
  const headings = [
    "Destination",
    "Category",
    "Location",
    "Status",
    "Date added",
    "Actions",
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E4E8DF] bg-white">
      <table className="w-full min-w-[750px] text-left">
        <thead className="border-b border-[#E4E8DF] bg-[#F8FAF6]">
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sm:px-4"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-[#EDF0E9]">
          {destinations.map((destination) => (
            <tr
              key={getId(destination)}
              className="transition hover:bg-[#FAFCF8]"
            >
              <td className="px-3 py-3 sm:px-4">
                <div className="flex items-center gap-2.5">
                  <DestinationImage
                    destination={destination}
                    className="h-10 w-12 shrink-0 rounded-lg sm:h-12 sm:w-14"
                  />

                  <div className="min-w-0">
                    <p className="max-w-64 truncate text-xs font-bold text-[#18352A]">
                      {destination.name || "Untitled destination"}
                    </p>

                    <p className="mt-1 max-w-64 truncate text-[10px] text-slate-400">
                      {destination.shortDescription || "No short description"}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-3 py-3 text-xs text-[#294638] sm:px-4">
                {getCategoryLabel(destination)}
              </td>

              <td className="px-3 py-3 text-xs text-slate-500 sm:px-4">
                {[destination.city, destination.lga, destination.state]
                  .filter(Boolean)
                  .join(", ") || "Not provided"}
              </td>

              <td className="px-3 py-3 sm:px-4">
                <StatusBadge published={Boolean(destination.isPublished)} />
              </td>

              <td className="px-3 py-3 text-xs text-slate-500 sm:px-4">
                {formatDate(destination.createdAt)}
              </td>

              <td className="px-3 py-3 sm:px-4">
                <DestinationActions
                  destination={destination}
                  onDelete={onDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDestinationsPage() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");

  const loadDestinations = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const response = await apiRequest("destinations/admin");
      setDestinations(extractDestinations(response));
    } catch (err) {
      setError(err?.message || "Could not load destinations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDestinations(true);
  }, [loadDestinations]);

  const filteredDestinations = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = destinations.filter((destination) => {
      const matchesSearch =
        !query ||
        [
          destination.name,
          destination.shortDescription,
          destination.address,
          destination.city,
          destination.lga,
          destination.state,
          destination.category,
          destination.categoryLabel,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCategory =
        category === "all" || destination.category === category;

      const matchesStatus =
        status === "all" ||
        (status === "published" && Boolean(destination.isPublished)) ||
        (status === "draft" && !destination.isPublished);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    filtered.sort((a, b) => {
      if (sortBy === "name-asc") {
        return String(a.name || "").localeCompare(String(b.name || ""));
      }

      if (sortBy === "name-desc") {
        return String(b.name || "").localeCompare(String(a.name || ""));
      }

      if (sortBy === "oldest") {
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      }

      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    return filtered;
  }, [destinations, search, category, status, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, category, status, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDestinations.length / PAGE_SIZE),
  );

  const visibleDestinations = filteredDestinations.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const publishedCount = destinations.filter((destination) =>
    Boolean(destination.isPublished),
  ).length;

  const draftCount = destinations.length - publishedCount;

  const hasActiveFilters = Boolean(
    search || category !== "all" || status !== "all",
  );

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setStatus("all");
    setSortBy("newest");
    setPage(1);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;

    const destinationToDelete = deleteTarget;
    const destinationId = getId(destinationToDelete);

    if (!destinationId) {
      setError("This destination has no valid ID and cannot be deleted.");
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`destinations/${encodeURIComponent(destinationId)}`, {
        method: "DELETE",
      });

      const nextDestinations = destinations.filter(
        (destination) => getId(destination) !== destinationId,
      );

      setDestinations(nextDestinations);
      setNotice(`${destinationToDelete.name || "Destination"} was deleted.`);
      setDeleteTarget(null);

      const query = search.trim().toLowerCase();

      const nextFilteredCount = nextDestinations.filter((destination) => {
        const matchesSearch =
          !query ||
          [
            destination.name,
            destination.shortDescription,
            destination.address,
            destination.city,
            destination.lga,
            destination.state,
            destination.category,
            destination.categoryLabel,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));

        const matchesCategory =
          category === "all" || destination.category === category;

        const matchesStatus =
          status === "all" ||
          (status === "published" && Boolean(destination.isPublished)) ||
          (status === "draft" && !destination.isPublished);

        return matchesSearch && matchesCategory && matchesStatus;
      }).length;

      const nextTotalPages = Math.max(
        1,
        Math.ceil(nextFilteredCount / PAGE_SIZE),
      );

      setPage((current) => Math.min(current, nextTotalPages));
    } catch (err) {
      setError(err?.message || "Could not delete this destination.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1440px] space-y-4 overflow-x-hidden pb-6 sm:space-y-5">
      <header className="flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE9D7] bg-[#EEF5EA] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#176B48] sm:gap-2 sm:px-3 sm:text-[10px]">
            <MapPin size={12} />
            Kaduna Explorer administration
          </span>

          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-[#103C2A] sm:mt-3 sm:text-3xl">
            Destinations
          </h1>

          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
            Manage destination listings, photographs, locations and publication
            status.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => loadDestinations(false)}
            disabled={refreshing || loading}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#DCE6D8] bg-white px-3 py-2.5 text-xs font-bold text-[#294638] transition hover:bg-[#F5F8F2] disabled:opacity-50 sm:gap-2 sm:px-4"
          >
            {refreshing ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Refresh
          </button>

          <Link
            href="/admin/destinations/new"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#FFBD4A] px-3 py-2.5 text-xs font-extrabold text-[#103C2A] transition hover:bg-[#F3AC2F] sm:gap-2 sm:px-4"
          >
            <Plus size={15} />
            Add destination
          </Link>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 sm:gap-3 sm:p-4 sm:text-sm"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <p className="min-w-0 flex-1 break-words">{error}</p>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-[#D5E8D0] bg-[#F0F7EC] p-3 text-xs text-[#176B48] sm:gap-3 sm:p-4 sm:text-sm">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />

          <p className="min-w-0 flex-1 break-words">{notice}</p>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="min-w-0 rounded-xl border border-[#E4E8DF] bg-white p-2.5 sm:rounded-2xl sm:p-4">
          <p className="text-[10px] font-semibold leading-4 text-slate-500 sm:text-xs">
            Total destinations
          </p>

          <p className="mt-1.5 text-xl font-extrabold text-[#103C2A] sm:mt-2 sm:text-2xl">
            {loading ? "—" : destinations.length}
          </p>

          <p className="mt-1 text-[9px] leading-4 text-slate-400 sm:text-[10px]">
            All records
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-[#E4E8DF] bg-white p-2.5 sm:rounded-2xl sm:p-4">
          <p className="text-[10px] font-semibold leading-4 text-slate-500 sm:text-xs">
            Published
          </p>

          <p className="mt-1.5 text-xl font-extrabold text-emerald-700 sm:mt-2 sm:text-2xl">
            {loading ? "—" : publishedCount}
          </p>

          <p className="mt-1 text-[9px] leading-4 text-slate-400 sm:text-[10px]">
            Visible to visitors
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-[#E4E8DF] bg-white p-2.5 sm:rounded-2xl sm:p-4">
          <p className="text-[10px] font-semibold leading-4 text-slate-500 sm:text-xs">
            Drafts
          </p>

          <p className="mt-1.5 text-xl font-extrabold text-amber-700 sm:mt-2 sm:text-2xl">
            {loading ? "—" : draftCount}
          </p>

          <p className="mt-1 text-[9px] leading-4 text-slate-400 sm:text-[10px]">
            Not published
          </p>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-[#E4E8DF] bg-white p-3 sm:p-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-[#176B48]" />

          <h2 className="text-xs font-extrabold text-[#103C2A] sm:text-sm">
            Search and filters
          </h2>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
          <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, address, LGA..."
              className={`${inputClass} pl-9`}
              aria-label="Search destinations"
            />
          </div>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={inputClass}
            aria-label="Filter by category"
          >
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass}
            aria-label="Filter by publication status"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className={inputClass}
            aria-label="Sort destinations"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
          </select>
        </div>

        <div className="mt-3 flex min-w-0 flex-col justify-between gap-3 border-t border-[#EDF0E9] pt-3 sm:mt-4 sm:flex-row sm:items-center sm:pt-4">
          <p className="text-[10px] leading-4 text-slate-500 sm:text-xs">
            {loading
              ? "Loading destinations..."
              : `Showing ${
                  filteredDestinations.length ? (page - 1) * PAGE_SIZE + 1 : 0
                }–${Math.min(
                  page * PAGE_SIZE,
                  filteredDestinations.length,
                )} of ${filteredDestinations.length} destinations`}
          </p>

          <div className="flex items-center gap-1 self-end rounded-lg bg-[#F7F9F5] p-1 sm:self-auto">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold sm:text-xs ${
                view === "grid"
                  ? "bg-[#EAF2E6] text-[#176B48]"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Grid2X2 size={14} />
              Grid
            </button>

            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold sm:text-xs ${
                view === "list"
                  ? "bg-[#EAF2E6] text-[#176B48]"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <List size={14} />
              List
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[#E4E8DF] bg-white sm:min-h-64">
          <div className="flex items-center gap-3 text-xs font-semibold text-[#53715C] sm:text-sm">
            <LoaderCircle size={20} className="animate-spin" />
            Loading destinations...
          </div>
        </div>
      ) : filteredDestinations.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
      ) : view === "grid" ? (
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visibleDestinations.map((destination) => (
            <DestinationCard
              key={getId(destination)}
              destination={destination}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <DestinationTable
          destinations={visibleDestinations}
          onDelete={setDeleteTarget}
        />
      )}

      {!loading && filteredDestinations.length > PAGE_SIZE && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#E4E8DF] bg-white p-3 sm:flex-row sm:p-4">
          <p className="text-[10px] text-slate-500 sm:text-xs">
            Page {page} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#DCE6D8] px-3 py-2 text-[10px] font-bold text-[#294638] hover:bg-[#F5F8F2] disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page === totalPages}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#DCE6D8] px-3 py-2 text-[10px] font-bold text-[#294638] hover:bg-[#F5F8F2] disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#10251B]/55 p-3 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-destination-title"
            className="w-full max-w-md rounded-2xl border border-[#E4E8DF] bg-white p-4 shadow-2xl sm:p-6"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 sm:h-11 sm:w-11">
              <Trash2 size={19} />
            </div>

            <h2
              id="delete-destination-title"
              className="mt-3 text-base font-extrabold text-[#103C2A] sm:mt-4 sm:text-lg"
            >
              Delete destination?
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
              You are about to delete{" "}
              <strong className="text-[#294638]">
                {deleteTarget.name || "this destination"}
              </strong>
              . This action cannot be undone.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="min-h-10 rounded-xl border border-[#DCE6D8] px-4 py-2.5 text-xs font-bold text-[#294638] hover:bg-[#F5F8F2] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}

                {deleting ? "Deleting..." : "Delete destination"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
