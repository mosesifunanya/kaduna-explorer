"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Compass,
  LoaderCircle,
  MapPin,
  Mountain,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Save,
  Trash2,
  X,
} from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import { apiRequest } from "@/lib/api";

const EMPTY_FORM = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  status: "planned",
};

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

const inputClass =
  "w-full min-w-0 rounded-xl border border-[#DCE5DA] bg-white px-3 py-2.5 text-sm text-[#183B2A] outline-none transition placeholder:text-[#9AA79B] focus:border-[#397B55] focus:ring-4 focus:ring-[#397B55]/10";

const labelClass = "mb-1.5 block text-xs font-bold text-[#49614D]";

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function dateForInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getTripDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const first = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(1, Math.round((last - first) / 86400000) + 1);
}

function getOrderedDestinations(trip) {
  return Array.isArray(trip?.destinations)
    ? [...trip.destinations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
}

function getDestination(item) {
  return item?.destination && typeof item.destination === "object"
    ? item.destination
    : null;
}

function getDestinationId(item) {
  const destination = item?.destination;
  if (typeof destination === "string") return destination;
  return destination?._id || destination?.id || "";
}

function getDestinationImage(destination) {
  const cover = destination?.coverImage;

  if (typeof cover === "string") return cover;
  if (cover?.url) return cover.url;

  if (Array.isArray(destination?.images) && destination.images.length) {
    const first = destination.images[0];
    return typeof first === "string" ? first : first?.url || "";
  }

  return "";
}

function getStatusStyle(status) {
  if (status === "ongoing") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (status === "completed") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  return "border-[#F1E4C6] bg-[#FFF5DF] text-[#90651B]";
}

function StatusBadge({ status }) {
  const label =
    STATUS_OPTIONS.find((option) => option.value === status)?.label ||
    "Planned";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold ${getStatusStyle(status)}`}
    >
      <span
        className={`mr-2 h-1.5 w-1.5 rounded-full ${
          status === "completed"
            ? "bg-[#398052]"
            : status === "ongoing"
              ? "bg-blue-500"
              : "bg-[#C28A27]"
        }`}
      />
      {label}
    </span>
  );
}

function TripForm({
  form,
  editingId,
  saving,
  formError,
  onChange,
  onSubmit,
  onClose,
  reduceMotion,
}) {
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
      className="mt-6 overflow-hidden rounded-[24px] border border-[#E3EAE0] bg-white shadow-[0_12px_40px_rgba(27,59,39,0.06)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#EDF1EB] px-5 py-5 sm:px-7">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A17A34]">
            Trip details
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#183B2A]">
            {editingId ? "Update your trip" : "Create a new trip"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#778579]">
            Give your adventure a name and choose when you plan to travel.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close trip form"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5EBE3] text-[#68796C] transition hover:bg-[#F4F7F1]"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-7">
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {formError}
          </div>
        )}

        <div>
          <label htmlFor="trip-name" className={labelClass}>
            Trip name
          </label>
          <input
            id="trip-name"
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Give your trip a name"
            maxLength={120}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="trip-description" className={labelClass}>
            Description{" "}
            <span className="font-normal text-[#91A092]">Optional</span>
          </label>
          <textarea
            id="trip-description"
            name="description"
            value={form.description}
            onChange={onChange}
            placeholder="What would you like to experience?"
            rows={3}
            maxLength={2000}
            className={`${inputClass} resize-y`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="trip-start" className={labelClass}>
              Start date
            </label>
            <input
              id="trip-start"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={onChange}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="trip-end" className={labelClass}>
              End date
            </label>
            <input
              id="trip-end"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={onChange}
              min={form.startDate || undefined}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="trip-status" className={labelClass}>
            Trip status
          </label>
          <select
            id="trip-status"
            name="status"
            value={form.status}
            onChange={onChange}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#EDF1EB] pt-5 sm:flex-row">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#174B35] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#103C2A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <LoaderCircle size={17} className="animate-spin" />}
            {saving ? "Saving..." : editingId ? "Save changes" : "Create trip"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#DCE5DA] px-6 py-3 text-sm font-bold text-[#48614D] transition hover:bg-[#F5F7F2] disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.section>
  );
}

function EmptyTrips({ onCreate }) {
  return (
    <section className="mt-7 rounded-[26px] border border-dashed border-[#D5E0D4] bg-white px-5 py-14 text-center sm:py-20">
      <div className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-[25px] bg-[#EAF2E9] text-[#18543A]">
        <Route size={32} strokeWidth={1.7} />
      </div>

      <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A17A34]">
        Your journey begins here
      </p>

      <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[#183B2A] sm:text-2xl">
        No trips planned yet
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#778579]">
        Start putting your Kaduna adventure together. Create a trip, choose your
        travel dates and organise the places you want to visit.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#174B35] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#103C2A]"
      >
        <Plus size={18} />
        Plan your first trip
      </button>
    </section>
  );
}

function ItineraryItem({
  item,
  index,
  total,
  trip,
  onMove,
  onRemove,
  onChange,
  busy,
}) {
  const destination = getDestination(item);
  const image = getDestinationImage(destination);
  const slug = destination?.slug;
  const title = destination?.name || "Destination unavailable";

  return (
    <div className="rounded-2xl border border-[#E7EDE5] bg-white p-3 sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4DC] text-[11px] font-extrabold text-[#8A641F]">
            {index + 1}
          </span>

          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0 || busy}
            aria-label={`Move ${title} up`}
            className="rounded-md p-1 text-[#718174] transition hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-25"
          >
            <ChevronUp size={16} />
          </button>

          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1 || busy}
            aria-label={`Move ${title} down`}
            className="rounded-md p-1 text-[#718174] transition hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-25"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {image ? (
          <OptimizedImage
            src={image}
            alt={title}
            width={88}
            height={88}
            sizes="(min-width: 640px) 88px, 76px"
            className="h-[76px] w-[76px] shrink-0 rounded-xl object-cover sm:h-[88px] sm:w-[88px]"
          />
        ) : (
          <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-xl bg-[#EDF4EB] text-[#39734A] sm:h-[88px] sm:w-[88px]">
            <MapPin size={25} />
          </div>
        )}

        <div className="min-w-0 flex-1 pt-0.5">
          {slug ? (
            <Link
              href={`/explore/${encodeURIComponent(slug)}`}
              className="break-words text-sm font-extrabold text-[#315F40] transition-colors hover:text-[#A17A34] hover:underline"
            >
              {title}
            </Link>
          ) : (
            <p className="break-words text-sm font-extrabold text-[#38533E]">
              {title}
            </p>
          )}

          {(destination?.category || destination?.address) && (
            <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-[#89968A]">
              {[destination.category, destination.address]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                item.visitStatus === "visited"
                  ? "bg-green-50 text-green-700"
                  : "bg-[#FFF5DF] text-[#90651B]"
              }`}
            >
              {item.visitStatus === "visited" ? "Visited" : "Planned"}
            </span>

            {item.visitDate && (
              <span className="text-[10px] font-medium text-[#A17A34]">
                {formatDate(item.visitDate)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={busy}
          aria-label={`Remove ${title} from trip`}
          className="shrink-0 rounded-lg p-2 text-[#A65B56] transition hover:bg-[#FFF2F0] disabled:opacity-40"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#EFF2ED] pt-3 sm:grid-cols-2">
        <div>
          <label
            className={labelClass}
            htmlFor={`visit-date-${trip._id}-${index}`}
          >
            Visit date
          </label>
          <input
            id={`visit-date-${trip._id}-${index}`}
            type="date"
            min={dateForInput(trip.startDate)}
            max={dateForInput(trip.endDate)}
            value={dateForInput(item.visitDate)}
            onChange={(event) =>
              onChange(index, "visitDate", event.target.value)
            }
            className={inputClass}
          />
        </div>

        <div>
          <label
            className={labelClass}
            htmlFor={`visit-status-${trip._id}-${index}`}
          >
            Visit status
          </label>
          <select
            id={`visit-status-${trip._id}-${index}`}
            value={item.visitStatus || "planned"}
            onChange={(event) =>
              onChange(index, "visitStatus", event.target.value)
            }
            className={inputClass}
          >
            <option value="planned">Planned</option>
            <option value="visited">Visited</option>
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label
          className={labelClass}
          htmlFor={`visit-notes-${trip._id}-${index}`}
        >
          Personal notes
        </label>
        <textarea
          id={`visit-notes-${trip._id}-${index}`}
          value={item.notes || ""}
          onChange={(event) => onChange(index, "notes", event.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Add reminders or things you want to do here..."
          className={`${inputClass} resize-y`}
        />
        <p className="mt-1 text-right text-[10px] text-[#9AA79B]">
          {(item.notes || "").length}/1000
        </p>
      </div>
    </div>
  );
}

function ItineraryEditor({ trip, onSave, onCancel, saving, reduceMotion }) {
  const [draft, setDraft] = useState(() =>
    getOrderedDestinations(trip).map((item, index) => ({
      ...item,
      order: index,
      destination: getDestinationId(item),
    })),
  );

  const [error, setError] = useState("");

  const original = useMemo(
    () =>
      getOrderedDestinations(trip).map((item, index) => ({
        destination: getDestinationId(item),
        visitDate: dateForInput(item.visitDate),
        visitStatus: item.visitStatus || "planned",
        notes: item.notes || "",
        order: index,
      })),
    [trip],
  );

  const current = useMemo(
    () =>
      draft.map((item, index) => ({
        destination: getDestinationId(item),
        visitDate: dateForInput(item.visitDate),
        visitStatus: item.visitStatus || "planned",
        notes: item.notes || "",
        order: index,
      })),
    [draft],
  );

  const changed = JSON.stringify(original) !== JSON.stringify(current);

  function handleMove(index, direction) {
    setDraft((items) => {
      const next = [...items];
      const target = index + direction;

      if (target < 0 || target >= next.length) return items;

      [next[index], next[target]] = [next[target], next[index]];

      return next.map((item, order) => ({ ...item, order }));
    });
  }

  function handleRemove(index) {
    setDraft((items) =>
      items
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, order) => ({ ...item, order })),
    );
  }

  function handleChange(index, field, value) {
    setDraft((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function handleSave() {
    setError("");

    const invalidVisitDate = draft.some((item) => {
      if (!item.visitDate) return false;

      const date = new Date(item.visitDate);
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);

      if (
        Number.isNaN(date.getTime()) ||
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        return true;
      }

      return (
        date < new Date(start.setHours(0, 0, 0, 0)) ||
        date > new Date(end.setHours(23, 59, 59, 999))
      );
    });

    if (invalidVisitDate) {
      setError("Each visit date must fall within your trip dates.");
      return;
    }

    if (draft.some((item) => (item.notes || "").length > 1000)) {
      setError("Personal notes cannot exceed 1000 characters.");
      return;
    }

    try {
      const result = await onSave(
        draft.map((item, order) => ({
          destination: getDestinationId(item),
          visitDate: item.visitDate || null,
          visitStatus: item.visitStatus || "planned",
          notes: item.notes || "",
          order,
        })),
      );

      if (result) {
        setDraft(
          getOrderedDestinations(result).map((item, index) => ({
            ...item,
            order: index,
            destination: getDestinationId(item),
          })),
        );
      }
    } catch (err) {
      setError(err.message || "Unable to save your itinerary.");
    }
  }

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      className="overflow-hidden"
    >
      <div className="mt-5 rounded-2xl border border-[#E4EBE1] bg-[#F8FAF6] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#A17A34]">
              Your itinerary
            </p>
            <h3 className="mt-1 text-base font-extrabold text-[#183B2A]">
              Organise your destinations
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#829084]">
              Arrange your stops, choose visit dates and keep personal notes.
            </p>
          </div>

          <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#54705A]">
            {draft.length} {draft.length === 1 ? "place" : "places"}
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            {error}
          </div>
        )}

        {draft.length ? (
          <div className="mt-4 space-y-3">
            {draft.map((item, index) => (
              <ItineraryItem
                key={getDestinationId(item) || index}
                item={item}
                index={index}
                total={draft.length}
                trip={trip}
                onMove={handleMove}
                onRemove={handleRemove}
                onChange={handleChange}
                busy={saving}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-[#D6E2D4] bg-white px-4 py-8 text-center">
            <MapPin size={23} className="mx-auto text-[#7A967D]" />
            <p className="mt-2 text-sm font-bold text-[#48614D]">
              No destinations in this itinerary
            </p>
            <p className="mt-1 text-xs text-[#89968A]">
              Explore Kaduna and add places to this trip.
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EEE5] pt-4">
          <Link
            href="/explore"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DCE5DA] bg-white px-4 py-2 text-xs font-bold text-[#315B3D] transition hover:bg-[#F1F6EF]"
          >
            <Plus size={15} />
            Add more places
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-xs font-bold text-[#718174] transition hover:bg-white disabled:opacity-50"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !changed}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#174B35] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#103C2A] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {saving ? "Saving..." : "Save itinerary"}
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function TripCard({
  trip,
  onEdit,
  onDelete,
  deleting,
  onSaveItinerary,
  reduceMotion,
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState(false);
  const [savingItinerary, setSavingItinerary] = useState(false);

  const destinations = getOrderedDestinations(trip);
  const duration = getTripDuration(trip.startDate, trip.endDate);

  async function handleSaveItinerary(items) {
    setSavingItinerary(true);

    try {
      const result = await onSaveItinerary(trip, items);
      setEditingItinerary(false);
      return result;
    } finally {
      setSavingItinerary(false);
    }
  }

  return (
    <motion.article
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-[24px] border border-[#E4EAE1] bg-white shadow-[0_8px_28px_rgba(27,59,39,0.045)] transition-shadow hover:shadow-[0_15px_38px_rgba(27,59,39,0.09)]"
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={trip.status} />
              <span className="text-[11px] font-medium text-[#99A399]">
                {destinations.length}{" "}
                {destinations.length === 1 ? "destination" : "destinations"}
              </span>
            </div>

            <h2 className="mt-3 break-words text-xl font-extrabold tracking-tight text-[#183B2A] sm:text-2xl">
              {trip.name}
            </h2>

            {trip.description && (
              <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-[#78867A]">
                {trip.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#78867A]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} className="text-[#A17A34]" />
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </span>

              {duration && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={14} className="text-[#A17A34]" />
                  {duration} {duration === 1 ? "day" : "days"}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(trip)}
              aria-label={`Edit ${trip.name}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#DCE5DA] px-3 text-xs font-bold text-[#48614D] transition hover:bg-[#F2F6F0]"
            >
              <Pencil size={14} />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(trip)}
              disabled={deleting}
              aria-label={`Delete ${trip.name}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#F0DDDA] text-[#A65B56] transition hover:bg-[#FFF2F0] disabled:opacity-50"
            >
              {deleting ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1EB] pt-4">
          <button
            type="button"
            onClick={() => {
              setExpanded((value) => !value);
              if (expanded) setEditingItinerary(false);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F0F5EF] px-4 py-2 text-xs font-bold text-[#315B3D] transition hover:bg-[#E5EEE3]"
          >
            <Route size={15} />
            {expanded ? "Hide itinerary" : "View itinerary"}
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          <span className="text-[10px] font-medium text-[#9AA79B]">
            Updated {formatDate(trip.updatedAt || trip.createdAt)}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
              className="overflow-hidden"
            >
              {!editingItinerary ? (
                <div className="mt-5 rounded-2xl border border-[#E7EDE5] bg-[#FAFBF8] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#A17A34]">
                        Travel plan
                      </p>
                      <h3 className="mt-1 text-sm font-extrabold text-[#183B2A]">
                        Your destinations
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingItinerary(true)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#DCE5DA] bg-white px-3 py-2 text-xs font-bold text-[#315B3D] transition hover:bg-[#F0F5EF]"
                    >
                      <Pencil size={13} />
                      Manage itinerary
                    </button>
                  </div>

                  {destinations.length ? (
                    <div className="mt-4 space-y-3">
                      {destinations.map((item, index) => {
                        const destination = getDestination(item);
                        const image = getDestinationImage(destination);
                        const title =
                          destination?.name || "Destination unavailable";

                        return (
                          <div
                            key={getDestinationId(item) || index}
                            className="flex min-w-0 items-center gap-3 rounded-xl bg-white p-3"
                          >
                            {image ? (
                              <OptimizedImage
                                src={image}
                                alt={title}
                                width={48}
                                height={48}
                                sizes="48px"
                                className="h-12 w-12 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#EDF4EB] text-[#39734A]">
                                <MapPin size={18} />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              {destination?.slug ? (
                                <Link
                                  href={`/explore/${encodeURIComponent(destination.slug)}`}
                                  className="block truncate text-xs font-extrabold text-[#315B3D] transition hover:text-[#A17A34]"
                                >
                                  {index + 1}. {title}
                                </Link>
                              ) : (
                                <p className="truncate text-xs font-extrabold text-[#315B3D]">
                                  {index + 1}. {title}
                                </p>
                              )}

                              <p className="mt-1 text-[10px] text-[#89968A]">
                                {item.visitStatus === "visited"
                                  ? "Visited"
                                  : "Planned"}
                                {item.visitDate
                                  ? ` · ${formatDate(item.visitDate)}`
                                  : ""}
                              </p>
                            </div>

                            {item.visitStatus === "visited" && (
                              <CheckCircle2
                                size={17}
                                className="shrink-0 text-[#398052]"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-[#D6E2D4] bg-white px-4 py-8 text-center">
                      <MapPin size={23} className="mx-auto text-[#7A967D]" />
                      <p className="mt-2 text-sm font-bold text-[#48614D]">
                        No destinations added yet
                      </p>
                      <p className="mt-1 text-xs text-[#89968A]">
                        Explore Kaduna and add places to this trip.
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href="/explore"
                      className="inline-flex min-h-9 items-center gap-2 text-xs font-extrabold text-[#315F40] transition hover:text-[#A17A34]"
                    >
                      Explore destinations
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : (
                <ItineraryEditor
                  trip={trip}
                  onSave={handleSaveItinerary}
                  onCancel={() => setEditingItinerary(false)}
                  saving={savingItinerary}
                  reduceMotion={reduceMotion}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/explore"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DCE5DA] px-4 py-2 text-xs font-bold text-[#315B3D] transition hover:bg-[#F3F7F1]"
          >
            <Plus size={15} />
            Add more places
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default function MyTripsPage() {
  const reduceMotion = useReducedMotion();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/trips");
      const items = response?.data?.trips;

      if (!Array.isArray(items)) {
        throw new Error("The server returned an unexpected trips response.");
      }

      setTrips(items);
    } catch (err) {
      setError(err.message || "Unable to load your trips.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const tripStats = useMemo(() => {
    const planned = trips.filter((trip) => trip.status === "planned").length;
    const ongoing = trips.filter((trip) => trip.status === "ongoing").length;
    const completed = trips.filter(
      (trip) => trip.status === "completed",
    ).length;

    const destinationCount = trips.reduce(
      (total, trip) => total + getOrderedDestinations(trip).length,
      0,
    );

    return {
      total: trips.length,
      planned,
      ongoing,
      completed,
      destinationCount,
    };
  }, [trips]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId("");
    setFormError("");
    setShowForm(false);
  }

  function openCreateForm() {
    setForm(EMPTY_FORM);
    setEditingId("");
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(trip) {
    setForm({
      name: trip.name || "",
      description: trip.description || "",
      startDate: dateForInput(trip.startDate),
      endDate: dateForInput(trip.endDate),
      status: trip.status || "planned",
    });

    setEditingId(trip._id);
    setFormError("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setFormError("Please enter a name for your trip.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setFormError("Please choose your trip start and end dates.");
      return;
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      setFormError("Your trip end date cannot be before the start date.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      };

      if (editingId) {
        const response = await apiRequest(
          `/trips/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );

        const updatedTrip = response?.data?.trip;

        if (updatedTrip) {
          setTrips((current) =>
            current.map((trip) =>
              trip._id === editingId ? updatedTrip : trip,
            ),
          );
        } else {
          await loadTrips();
        }

        setSuccess("Your trip has been updated successfully.");
      } else {
        const response = await apiRequest("/trips", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const createdTrip = response?.data?.trip;

        if (createdTrip) {
          setTrips((current) => [createdTrip, ...current]);
        } else {
          await loadTrips();
        }

        setSuccess("Your trip has been created successfully.");
      }

      resetForm();
    } catch (err) {
      setFormError(err.message || "Unable to save your trip.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(trip) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${trip.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(trip._id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/trips/${encodeURIComponent(trip._id)}`, {
        method: "DELETE",
      });

      setTrips((current) => current.filter((item) => item._id !== trip._id));

      if (editingId === trip._id) {
        resetForm();
      }

      setSuccess("Your trip has been deleted.");
    } catch (err) {
      setError(err.message || "Unable to delete this trip.");
    } finally {
      setDeletingId("");
    }
  }

  async function handleSaveItinerary(trip, items) {
    const response = await apiRequest(
      `/trips/${encodeURIComponent(trip._id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          destinations: items,
        }),
      },
    );

    const updatedTrip = response?.data?.trip;

    if (!updatedTrip) {
      throw new Error("The server did not return the updated trip.");
    }

    setTrips((current) =>
      current.map((item) => (item._id === trip._id ? updatedTrip : item)),
    );

    setSuccess("Your itinerary has been updated successfully.");

    return updatedTrip;
  }

  const recentTrips = useMemo(
    () =>
      [...trips]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0),
        )
        .slice(0, 3),
    [trips],
  );

  return (
    <main className="min-h-screen overflow-x-clip bg-[#FAF9F6] text-[#183B2A]">
      <Header activeNav="plan-trip" />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-14 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-bold text-[#55745D] transition hover:text-[#103C2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#397B55]"
        >
          <ArrowRight size={16} className="rotate-180" />
          Back to dashboard
        </Link>

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.55 }}
          className="relative isolate min-h-[265px] overflow-hidden rounded-[25px] bg-[#103C2A] sm:min-h-[290px] sm:rounded-[30px]"
        >
          <div className="absolute inset-0">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, rgba(8,35,24,0.93) 0%, rgba(13,55,37,0.82) 55%, rgba(13,55,37,0.48) 100%), url("https://itiner.com.ec/banners/paquetes.jpg?utm_source=chatgpt.com")',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B3021]/45 to-transparent" />
          </div>

          <div className="relative z-10 flex min-h-[265px] flex-col justify-center px-6 py-9 sm:min-h-[290px] sm:px-10 lg:px-12">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F5E5BD] backdrop-blur-sm">
                <Compass size={13} />
                Your Kaduna journey
              </span>

              <h1 className="mt-5 max-w-xl font-serif text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[46px]">
                Every great journey starts with a plan.
              </h1>

              <p className="mt-3 max-w-lg text-sm leading-6 text-white/80 sm:text-base">
                Bring your travel ideas together, organise your dates and build
                an itinerary of places you want to experience across Kaduna.
              </p>

              <button
                type="button"
                onClick={openCreateForm}
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E9B85B] px-5 py-3 text-xs font-extrabold text-[#183B2A] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#F2C875] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Plus size={16} />
                Create a trip
              </button>
            </div>
          </div>
        </motion.section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[
            {
              label: "Total trips",
              value: tripStats.total,
              icon: Route,
            },
            {
              label: "Planned",
              value: tripStats.planned,
              icon: CalendarDays,
            },
            {
              label: "Ongoing",
              value: tripStats.ongoing,
              icon: Compass,
            },
            {
              label: "Destinations",
              value: tripStats.destinationCount,
              icon: MapPin,
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <motion.div
                key={stat.label}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.4 }}
                className="rounded-2xl border border-[#E5EAE1] bg-white p-4 shadow-[0_5px_18px_rgba(27,59,39,0.035)] sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[#819083] sm:text-xs">
                    {stat.label}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EDF4EB] text-[#39734A]">
                    <Icon size={16} />
                  </span>
                </div>

                <p className="mt-3 text-2xl font-extrabold tabular-nums text-[#183B2A] sm:text-3xl">
                  {stat.value}
                </p>
              </motion.div>
            );
          })}
        </section>

        <AnimatePresence initial={false}>
          {showForm && (
            <TripForm
              form={form}
              editingId={editingId}
              saving={saving}
              formError={formError}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
              onClose={resetForm}
              reduceMotion={reduceMotion}
            />
          )}
        </AnimatePresence>

        {success && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="mt-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
              className="ml-auto shrink-0 rounded-md p-1 text-green-700 transition hover:bg-green-100"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span className="min-w-0 flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error message"
              className="shrink-0 rounded-md p-1 text-red-700 transition hover:bg-red-100"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="mt-9 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A17A34]">
              Your travel plans
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#183B2A] sm:text-3xl">
              My trips
            </h2>
            <p className="mt-1 text-sm text-[#849084]">
              Manage your journeys and the places you want to visit.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTrips}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#DCE5DA] bg-white px-4 py-2 text-xs font-bold text-[#48614D] transition hover:bg-[#F2F6F0] disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh trips
          </button>
        </div>

        {loading ? (
          <div className="mt-7 flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-[#E5EAE1] bg-white text-sm font-medium text-[#718174]">
            <LoaderCircle size={20} className="animate-spin text-[#39734A]" />
            Loading your trips...
          </div>
        ) : trips.length ? (
          <motion.div
            initial="hidden"
            animate="visible"
            className="mt-6 space-y-4"
          >
            {trips.map((trip) => (
              <TripCard
                key={trip._id}
                trip={trip}
                onEdit={openEditForm}
                onDelete={handleDelete}
                deleting={deletingId === trip._id}
                onSaveItinerary={handleSaveItinerary}
                reduceMotion={reduceMotion}
              />
            ))}
          </motion.div>
        ) : (
          <EmptyTrips onCreate={openCreateForm} />
        )}

        {recentTrips.length > 0 && (
          <section className="mt-10 rounded-[24px] border border-[#E5EAE1] bg-white p-5 shadow-[0_6px_24px_rgba(27,59,39,0.035)] sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A9B8D]">
              Your travel history
            </p>

            <h2 className="mt-2 font-serif text-2xl text-[#183B2A] sm:text-3xl">
              Recently updated
            </h2>

            <div className="mt-6 space-y-4">
              {recentTrips.map((trip) => (
                <div
                  key={trip._id}
                  className="flex min-w-0 items-start gap-3 border-b border-[#EDF0EA] pb-4 last:border-0 last:pb-0"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDF3EA] text-[#376347]">
                    <Compass size={17} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-[#31533C]">
                      {trip.name}
                    </p>

                    <p className="mt-1 text-xs text-[#89968C]">
                      Last updated{" "}
                      {formatDate(trip.updatedAt || trip.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/trips"
              className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#376347] transition hover:text-[#A27A35]"
            >
              Manage your trips
              <ArrowRight size={16} />
            </Link>
          </section>
        )}

        <section className="mt-8 rounded-[22px] border border-[#E6EBE2] bg-[#F2F6EF] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#39734A]">
              <Mountain size={19} />
            </span>

            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-[#31533C]">
                Still looking for places to visit?
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#78877A]">
                Explore Kaduna's destinations and add your favourites to your
                travel plans.
              </p>

              <Link
                href="/explore"
                className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-extrabold text-[#315F40] transition hover:text-[#A17A34]"
              >
                Explore destinations
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
