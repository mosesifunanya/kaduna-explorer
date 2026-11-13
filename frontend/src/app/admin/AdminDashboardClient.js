"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Star,
  Users,
  Plus,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
  Compass,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Eye,
  CalendarDays,
  GripVertical,
  Save,
  Search,
  CheckCircle2,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

function getList(response, key) {
  const candidates = [response?.data?.data, response?.data, response];

  for (const item of candidates) {
    if (Array.isArray(item)) return item;
    if (Array.isArray(item?.[key])) return item[key];
    if (Array.isArray(item?.results)) return item.results;
  }

  return [];
}

function getTotal(response, key, list) {
  const candidates = [
    response?.data?.pagination,
    response?.pagination,
    response?.data?.data,
    response?.data,
    response,
  ];

  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;

    const value = item[key] ?? item.total ?? item.totalResults ?? item.count;

    if (value !== undefined && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return list.length;
}

function getName(destination) {
  return destination?.name || destination?.title || "Untitled destination";
}

function getImage(destination) {
  if (typeof destination?.coverImage === "string") {
    return destination.coverImage;
  }

  return (
    destination?.coverImage?.url ||
    destination?.images?.[0]?.url ||
    (typeof destination?.images?.[0] === "string" ? destination.images[0] : "")
  );
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function MetricCard({ title, value, description, icon: Icon, href }) {
  return (
    <Link
      href={href}
      className="group block min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 sm:text-sm">{title}</p>

          <p className="mt-2 break-words text-2xl font-extrabold text-[#103C2A] sm:mt-3 sm:text-3xl">
            {value}
          </p>

          <p className="mt-2 text-[11px] leading-4 text-gray-500 sm:text-xs sm:leading-5">
            {description}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#176B48] sm:h-12 sm:w-12 sm:rounded-2xl">
          <Icon size={19} className="sm:hidden" />
          <Icon size={23} className="hidden sm:block" />
        </div>
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const [destinations, setDestinations] = useState([]);
  const [orderedDestinations, setOrderedDestinations] = useState([]);
  const [draggedDestinationId, setDraggedDestinationId] = useState(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderNotice, setOrderNotice] = useState("");
  const [orderError, setOrderError] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");

  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);

  const [totals, setTotals] = useState({
    destinations: 0,
    reviews: 0,
    users: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const getDestinationId = (destination) =>
    String(destination?._id || destination?.id || "");

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const results = await Promise.allSettled([
        apiRequest("destinations/admin"),
        apiRequest("reviews?page=1&limit=100"),
        apiRequest("users?page=1&limit=100"),
      ]);

      let failed = 0;

      if (results[0].status === "fulfilled") {
        const response = results[0].value;
        const list = getList(response, "destinations");

        const globallyOrdered = [...list].sort((a, b) => {
          const aOrder =
            a.displayOrder != null && Number.isFinite(Number(a.displayOrder))
              ? Number(a.displayOrder)
              : Number.MAX_SAFE_INTEGER;

          const bOrder =
            b.displayOrder != null && Number.isFinite(Number(b.displayOrder))
              ? Number(b.displayOrder)
              : Number.MAX_SAFE_INTEGER;

          return (
            aOrder - bOrder ||
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          );
        });

        setDestinations(globallyOrdered);
        setOrderedDestinations(globallyOrdered);

        setTotals((current) => ({
          ...current,
          destinations: getTotal(response, "totalDestinations", list),
        }));
      } else {
        failed++;
      }

      if (results[1].status === "fulfilled") {
        const response = results[1].value;
        const list = getList(response, "reviews");

        setReviews(list);

        setTotals((current) => ({
          ...current,
          reviews: getTotal(response, "totalReviews", list),
        }));
      } else {
        failed++;
      }

      if (results[2].status === "fulfilled") {
        const response = results[2].value;
        const list = getList(response, "users");

        setUsers(list);

        setTotals((current) => ({
          ...current,
          users: getTotal(response, "totalUsers", list),
        }));
      } else {
        failed++;
      }

      if (failed > 0) {
        setError(
          failed === 3
            ? "Dashboard data could not be loaded. Check your API connection and try again."
            : "Some dashboard information could not be loaded. Check your API endpoints.",
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          "Dashboard data could not be loaded. Check your API connection and try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Desktop mouse-based drag and drop.
  const handleDestinationDragStart = (event, destination) => {
    const id = getDestinationId(destination);

    if (!id) return;

    setDraggedDestinationId(id);
    setOrderNotice("");
    setOrderError("");

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDestinationDrop = (event, targetDestination) => {
    event.preventDefault();

    const draggedId =
      draggedDestinationId || event.dataTransfer.getData("text/plain");

    const targetId = getDestinationId(targetDestination);

    setDraggedDestinationId(null);

    if (!draggedId || !targetId || draggedId === targetId) return;

    setOrderNotice("");
    setOrderError("");

    setOrderedDestinations((current) => {
      const next = [...current];

      const fromIndex = next.findIndex(
        (item) => getDestinationId(item) === draggedId,
      );

      const toIndex = next.findIndex(
        (item) => getDestinationId(item) === targetId,
      );

      if (fromIndex < 0 || toIndex < 0) return current;

      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      return next;
    });
  };

  // Mobile tap-based reordering.
  const moveDestination = (destinationId, direction) => {
    if (!destinationId || orderSaving) return;

    setOrderNotice("");
    setOrderError("");

    setOrderedDestinations((current) => {
      const next = [...current];

      const currentIndex = next.findIndex(
        (item) => getDestinationId(item) === destinationId,
      );

      if (currentIndex < 0) return current;

      const nextIndex = currentIndex + direction;

      if (nextIndex < 0 || nextIndex >= next.length) {
        return current;
      }

      [next[currentIndex], next[nextIndex]] = [
        next[nextIndex],
        next[currentIndex],
      ];

      return next;
    });
  };

  const saveDestinationOrder = async () => {
    const destinationIds = orderedDestinations.map(getDestinationId);

    if (
      destinationIds.some((id) => !id) ||
      destinationIds.length !== destinations.length
    ) {
      setOrderError(
        "Some destinations are missing an ID. Refresh the dashboard and try again.",
      );
      return;
    }

    setOrderSaving(true);
    setOrderNotice("");
    setOrderError("");

    try {
      await apiRequest("destinations/reorder", {
        method: "PATCH",
        body: JSON.stringify({ destinationIds }),
      });

      setDestinations(orderedDestinations);
      setOrderNotice("Destination order saved successfully.");

      await loadDashboard(true);
    } catch (err) {
      setOrderError(
        err?.message ||
          "Could not save the destination order. Please try again.",
      );
    } finally {
      setOrderSaving(false);
    }
  };

  const resetDestinationOrder = () => {
    setOrderedDestinations(destinations);
    setOrderNotice("");
    setOrderError("");
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const published = destinations.filter(
    (item) => item.isPublished === true,
  ).length;

  const drafts = destinations.filter(
    (item) => item.isPublished !== true,
  ).length;

  const orderHasChanges =
    orderedDestinations.length !== destinations.length ||
    orderedDestinations.some(
      (item, index) =>
        getDestinationId(item) !== getDestinationId(destinations[index]),
    );

  const normalizedSearch = destinationSearch.trim().toLowerCase();

  const visibleDestinations = orderedDestinations.filter((destination) => {
    if (!normalizedSearch) return true;

    const searchableText = [
      getName(destination),
      destination.category,
      destination.categoryLabel,
      destination.lga,
      destination.city,
      destination.state,
      destination.address,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });

  const recentReviews = [...reviews]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 sm:space-y-8">
      {/* Dashboard header */}
      <section className="relative overflow-hidden rounded-2xl bg-[#103C2A] p-4 text-white sm:rounded-3xl sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[35px] border-white/5" />

        <div className="relative flex min-w-0 flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#FFBD4A]">
              <Compass size={15} />
              Administration
            </span>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:mt-5 sm:text-4xl">
              Dashboard overview
            </h1>

            <p className="mt-2 max-w-xl text-xs leading-5 text-white/70 sm:mt-3 sm:text-base sm:leading-6">
              Manage Kaduna destinations, visitor feedback, and platform
              accounts from one place.
            </p>

            <p className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-white/65 sm:mt-4 sm:text-xs">
              <CalendarDays size={15} />
              {new Intl.DateTimeFormat("en-NG", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={loading || refreshing || orderSaving}
              className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2 py-2.5 text-xs font-semibold transition hover:bg-white/15 disabled:opacity-60 sm:min-h-11 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
            >
              {refreshing ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>

            <Link
              href="/admin/destinations/new"
              className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-[#FFBD4A] px-2 py-2.5 text-xs font-bold text-[#103C2A] transition hover:bg-[#ffd16f] sm:min-h-11 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
            >
              <Plus size={18} />
              Add destination
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <div className="min-w-0 flex-1 text-sm leading-6">{error}</div>
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="rounded-lg px-3 py-2 text-xs font-bold hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Overview metrics */}
      <section className="min-w-0 space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-[#103C2A] sm:text-xl">
            Platform overview
          </h2>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Summary of the information returned by your API.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            title="Destinations"
            value={loading ? "…" : totals.destinations.toLocaleString("en-NG")}
            description="Destination records"
            icon={MapPin}
            href="/admin/destinations"
          />

          <MetricCard
            title="Published destinations"
            value={loading ? "…" : published.toLocaleString("en-NG")}
            description="Published destination records"
            icon={Eye}
            href="/admin/destinations"
          />

          <MetricCard
            title="Reviews"
            value={loading ? "…" : totals.reviews.toLocaleString("en-NG")}
            description="Visitor feedback records"
            icon={Star}
            href="/admin/reviews"
          />

          <MetricCard
            title="Registered users"
            value={loading ? "…" : totals.users.toLocaleString("en-NG")}
            description="Accounts returned by the API"
            icon={Users}
            href="/admin/users"
          />
        </div>
      </section>

      {/* Destination ordering and reviews */}
      <section className="grid min-w-0 grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-2">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5 lg:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-[#103C2A] sm:text-lg">
                Destination display order
              </h2>
              <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                Use the arrows on mobile or drag destinations on desktop.
              </p>
            </div>

            <Link
              href="/admin/destinations"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#176B48]"
            >
              Manage destinations <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
            <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50 p-2.5 sm:p-3">
              <p className="text-xs text-gray-500">Total destinations</p>
              <p className="mt-1 text-lg font-extrabold text-[#103C2A] sm:text-xl">
                {loading ? "…" : destinations.length.toLocaleString("en-NG")}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50 p-2.5 sm:p-3">
              <p className="text-xs text-gray-500">Published / drafts</p>
              <p className="mt-1 text-lg font-extrabold text-[#103C2A] sm:text-xl">
                {loading ? "…" : `${published} / ${drafts}`}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="destination-order-search" className="sr-only">
              Search destinations
            </label>

            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
              <Search size={17} className="shrink-0 text-gray-400" />
              <input
                id="destination-order-search"
                type="search"
                value={destinationSearch}
                onChange={(event) => setDestinationSearch(event.target.value)}
                placeholder="Search destinations..."
                className="min-h-10 w-full min-w-0 border-0 bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0 sm:min-h-11 sm:text-sm"
              />

              {destinationSearch && (
                <button
                  type="button"
                  onClick={() => setDestinationSearch("")}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {orderNotice && (
            <div
              role="status"
              className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <p>{orderNotice}</p>
            </div>
          )}

          {orderError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{orderError}</p>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-gray-500">
              {destinationSearch
                ? `${visibleDestinations.length} matching destinations`
                : "All destinations, including drafts, are included."}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetDestinationOrder}
                disabled={!orderHasChanges || orderSaving || loading}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={saveDestinationOrder}
                disabled={
                  !orderHasChanges ||
                  orderSaving ||
                  loading ||
                  destinations.length === 0
                }
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#176B48] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4"
              >
                {orderSaving ? (
                  <LoaderCircle className="animate-spin" size={15} />
                ) : (
                  <Save size={15} />
                )}
                {orderSaving ? "Saving..." : "Save order"}
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-[520px] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 sm:mt-4 sm:max-h-[620px]">
            {loading ? (
              <div className="flex items-center justify-center gap-3 px-4 py-12 text-sm text-gray-500">
                <LoaderCircle
                  size={20}
                  className="animate-spin text-[#176B48]"
                />
                Loading destinations...
              </div>
            ) : visibleDestinations.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <MapPin size={26} className="mx-auto text-gray-400" />
                <p className="mt-3 text-sm font-bold text-gray-800">
                  {destinations.length === 0
                    ? "No destinations yet"
                    : "No matching destinations"}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {destinations.length === 0
                    ? "Add a destination to begin managing its display position."
                    : "Try another search term."}
                </p>
                {destinations.length === 0 && (
                  <Link
                    href="/admin/destinations/new"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#103C2A] px-4 py-2 text-xs font-bold text-white"
                  >
                    <Plus size={14} />
                    Add destination
                  </Link>
                )}
              </div>
            ) : (
              visibleDestinations.map((destination) => {
                const id = getDestinationId(destination);
                const image = getImage(destination);
                const position = orderedDestinations.findIndex(
                  (item) => getDestinationId(item) === id,
                );

                return (
                  <div
                    key={id || getName(destination)}
                    draggable={Boolean(id) && !orderSaving}
                    onDragStart={(event) =>
                      handleDestinationDragStart(event, destination)
                    }
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDrop={(event) =>
                      handleDestinationDrop(event, destination)
                    }
                    onDragEnd={() => setDraggedDestinationId(null)}
                    className={`flex min-w-0 items-center gap-2 border-b border-gray-100 px-2 py-3 transition last:border-b-0 hover:bg-emerald-50/60 sm:gap-3 sm:px-4 ${
                      draggedDestinationId === id ? "opacity-40" : ""
                    }`}
                  >
                    {/* Desktop drag handle */}
                    <div className="hidden w-8 shrink-0 flex-col items-center gap-1 text-gray-400 sm:flex">
                      <GripVertical size={19} aria-hidden="true" />
                      <span className="text-[10px] font-bold tabular-nums text-gray-500">
                        {position + 1}
                      </span>
                    </div>

                    {/* Mobile position number */}
                    <div className="flex w-5 shrink-0 items-center justify-center text-[10px] font-bold tabular-nums text-gray-500 sm:hidden">
                      {position + 1}
                    </div>

                    {/* Destination image */}
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-emerald-50 sm:h-14 sm:w-14 sm:rounded-xl">
                      {image ? (
                        <img
                          src={image}
                          alt={getName(destination)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#176B48]">
                          <MapPin size={21} />
                        </div>
                      )}
                    </div>

                    {/* Destination information */}
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-xs font-bold leading-4 text-gray-800 sm:text-sm">
                        {getName(destination)}
                      </p>

                      <p className="mt-1 truncate text-[10px] text-gray-500 sm:text-xs">
                        {[destination.lga, destination.state || "Kaduna"]
                          .filter(Boolean)
                          .join(", ")}
                      </p>

                      <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-2">
                        <span className="rounded-full bg-gray-100 px-1.5 py-1 text-[9px] font-semibold capitalize text-gray-600 sm:px-2 sm:text-[10px]">
                          {String(
                            destination.category || "Uncategorized",
                          ).replaceAll("-", " ")}
                        </span>

                        <span
                          className={`rounded-full px-1.5 py-1 text-[9px] font-semibold sm:px-2 sm:text-[10px] ${
                            destination.isPublished
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {destination.isPublished ? "Published" : "Draft"}
                        </span>

                        {destination.isFeatured && (
                          <span className="rounded-full bg-orange-50 px-1.5 py-1 text-[9px] font-semibold text-orange-700 sm:px-2 sm:text-[10px]">
                            Featured #{destination.featuredOrder || "—"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Always render mobile reorder controls on small screens */}
                    {id && (
                      <div className="flex shrink-0 flex-col gap-1 sm:hidden">
                        <button
                          type="button"
                          onClick={() => moveDestination(id, -1)}
                          disabled={position <= 0 || orderSaving}
                          aria-label={`Move ${getName(destination)} up`}
                          title="Move up"
                          className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition active:bg-emerald-50 hover:border-emerald-400 hover:text-[#176B48] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowUp size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveDestination(id, 1)}
                          disabled={
                            position >= orderedDestinations.length - 1 ||
                            orderSaving
                          }
                          aria-label={`Move ${getName(destination)} down`}
                          title="Move down"
                          className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition active:bg-emerald-50 hover:border-emerald-400 hover:text-[#176B48] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowDown size={17} />
                        </button>
                      </div>
                    )}

                    {/* Edit destination */}
                    {id && (
                      <Link
                        href={`/admin/destinations/${encodeURIComponent(id)}/edit`}
                        aria-label={`Edit ${getName(destination)}`}
                        draggable={false}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-emerald-200 hover:bg-white hover:text-[#176B48] sm:h-10 sm:w-10 sm:rounded-xl"
                      >
                        <ArrowRight size={17} />
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p className="mt-3 text-xs leading-5 text-gray-400">
            On mobile, tap the up or down arrow to reorder a destination. On
            desktop, drag a destination onto another row. Select Save order to
            submit your changes.
          </p>
        </div>

        {/* Recent reviews */}
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#103C2A] sm:text-lg">
                Recent reviews
              </h2>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Latest visitor feedback
              </p>
            </div>

            <Link
              href="/admin/reviews"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#176B48]"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-5 divide-y divide-gray-100">
            {!loading && recentReviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
                <Star className="mx-auto text-gray-400" size={25} />
                <p className="mt-3 text-sm font-bold text-gray-800">
                  No reviews available
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Reviews will appear here when returned by the API.
                </p>
              </div>
            ) : (
              recentReviews.map((review, index) => {
                const author =
                  typeof review.user === "object"
                    ? review.user?.name || review.user?.email || "Visitor"
                    : review.name || review.authorName || "Visitor";

                const destination =
                  typeof review.destination === "object"
                    ? review.destination?.name ||
                      review.destination?.title ||
                      "Destination"
                    : "Destination";

                return (
                  <div
                    key={review._id || review.id || index}
                    className="py-3 sm:py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-800 sm:text-sm">
                          {author}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {destination}
                        </p>
                      </div>

                      {Number(review.rating) > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-amber-700">
                          <Star size={13} fill="currentColor" />
                          {review.rating}/5
                        </span>
                      )}
                    </div>

                    <p className="mt-2 break-words text-sm leading-5 text-gray-600">
                      {review.review ||
                        review.text ||
                        review.comment ||
                        "No written comment."}
                    </p>

                    <p className="mt-2 text-[10px] text-gray-400">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="min-w-0 space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-[#103C2A] sm:text-xl">
            Quick actions
          </h2>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Open the section you want to manage.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
          {[
            {
              title: "Add destination",
              description: "Create a new place listing.",
              icon: Plus,
              href: "/admin/destinations/new",
            },
            {
              title: "Manage destinations",
              description: "Edit details, images, and publication.",
              icon: MapPin,
              href: "/admin/destinations",
            },
            {
              title: "Manage reviews",
              description: "Review visitor feedback.",
              icon: Star,
              href: "/admin/reviews",
            },
            {
              title: "Manage users",
              description: "View registered accounts.",
              icon: Users,
              href: "/admin/users",
            },
          ].map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                href={action.href}
                className="group min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#176B48] group-hover:bg-[#103C2A] group-hover:text-white sm:h-11 sm:w-11">
                  <Icon size={20} />
                </div>

                <h3 className="mt-3 text-xs font-bold text-gray-800 sm:mt-4 sm:text-sm">
                  {action.title}
                </h3>

                <p className="mt-1.5 text-[11px] leading-4 text-gray-500 sm:mt-2 sm:text-xs sm:leading-5">
                  {action.description}
                </p>

                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#176B48] sm:mt-4 sm:text-xs">
                  Open section <ArrowRight size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="flex min-w-0 flex-col gap-2 border-t border-gray-200 py-4 text-[11px] text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:py-5 sm:text-xs">
        <p>Kaduna Explorer Administration</p>
        <Link href="/" className="hover:text-[#176B48]">
          Visit public website
        </Link>
      </footer>
    </main>
  );
}
