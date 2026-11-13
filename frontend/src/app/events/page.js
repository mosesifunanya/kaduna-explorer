"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
  ArrowRight,
  Compass,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  RadioTower,
  LoaderCircle,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

// ============================================
// CONSTANTS
// ============================================

const STARTING_SOON_HOURS = 24;
const ENDED_RETENTION_HOURS = 24;

const SORT_OPTIONS = [
  { value: "upcoming", label: "Upcoming first" },
  { value: "newest", label: "Recently added" },
  { value: "oldest", label: "Oldest added" },
  { value: "rating", label: "Highest rated" },
];

// ============================================
// EVENT RESPONSE HELPERS
// ============================================

function extractEvents(response) {
  const candidates = [
    response?.data?.events,
    response?.data?.data?.events,
    response?.events,
    response?.data?.data,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) || [];
}

function extractEventFavorites(response) {
  const candidates = [
    response?.data?.favorites,
    response?.data?.data?.favorites,
    response?.favorites,
    response?.data?.data,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) || [];
}

function getFavoriteEventId(favorite) {
  const event = favorite?.event;

  return String(
    (event && typeof event === "object" ? event._id || event.id : event) ||
      favorite?.eventId ||
      "",
  );
}

function getEventId(event) {
  return String(event?._id || event?.id || "");
}

function getEventSlug(event) {
  return event?.slug || getEventId(event);
}

function getEventTitle(event) {
  return event?.title || event?.name || "Untitled event";
}

function getEventImage(event) {
  const cover = event?.coverImage;

  if (typeof cover === "string" && cover.trim()) {
    return cover.trim();
  }

  if (cover?.url) return cover.url;

  const firstImage = Array.isArray(event?.images) ? event.images[0] : null;

  if (typeof firstImage === "string") return firstImage;

  return firstImage?.url || "";
}

function getCategoryLabel(event) {
  return (
    event?.categoryLabel ||
    String(event?.category || "Event")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function getEventLocation(event) {
  return [event?.venue, event?.address, event?.city, event?.lga, event?.state]
    .filter((value) => typeof value === "string" && value.trim())
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");
}

function getEventDate(value, options = {}) {
  if (!value) return "Date to be announced";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date to be announced";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
    ...options,
  }).format(date);
}

function getEventDateTime(value) {
  if (!value) return "Date to be announced";

  return getEventDate(value, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getEventDateRange(event) {
  const startDate = event?.startDate;
  const endDate = event?.endDate;

  if (!startDate) return "Date to be announced";

  const start = getEventDateTime(startDate);

  if (!endDate) return start;

  const end = getEventDateTime(endDate);

  return start === end ? start : `${start} – ${end}`;
}

function getEventStatus(event, now = 0) {
  const start = new Date(event?.startDate).getTime();
  const end = new Date(event?.endDate).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return "upcoming";
  }

  if (now >= end + ENDED_RETENTION_HOURS * 60 * 60 * 1000) {
    return "expired";
  }

  if (now >= end) return "ended";
  if (now >= start) return "live";

  if (start - now <= STARTING_SOON_HOURS * 60 * 60 * 1000) {
    return "starting-soon";
  }

  return "upcoming";
}

function getStatusLabel(status) {
  const labels = {
    upcoming: "Upcoming",
    "starting-soon": "Starting soon",
    live: "Live now",
    ended: "Recently ended",
    expired: "Ended",
  };

  return labels[status] || "Upcoming";
}

function getStatusClasses(status) {
  const classes = {
    upcoming: "bg-[#EAF0F2] text-[#063B5C]",
    "starting-soon": "bg-[#FFF3D9] text-[#93600C]",
    live: "bg-[#FCE8E8] text-[#B52D35]",
    ended: "bg-[#ECEAE4] text-[#6C7479]",
    expired: "bg-[#ECEAE4] text-[#6C7479]",
  };

  return classes[status] || classes.upcoming;
}

function getEventPrice(event) {
  if (event?.isFree || event?.price === 0 || event?.entranceFee === 0) {
    return "Free entry";
  }

  if (event?.price) {
    return `₦${Number(event.price).toLocaleString("en-NG")}`;
  }

  if (event?.entranceFee) {
    return `₦${Number(event.entranceFee).toLocaleString("en-NG")}`;
  }

  return "";
}

// ============================================
// EVENT IMAGE
// ============================================

function EventImage({ event }) {
  const image = getEventImage(event);

  if (image) {
    return (
      <img
        src={image}
        alt={getEventTitle(event)}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#063B5C] via-[#063B5C] to-[#092F49]">
      <div className="text-center text-white/70">
        <CalendarDays size={36} className="mx-auto text-[#F5C45E]" />
        <p className="mt-3 text-xs font-semibold tracking-wide">
          Kaduna Explorer
        </p>
      </div>
    </div>
  );
}

// ============================================
// EVENT STATUS
// ============================================

function EventStatus({ event, now }) {
  const status = getEventStatus(event, now);

  return (
    <span
      className={`inline-flex w-fit max-w-full items-center whitespace-nowrap rounded-full px-2 py-1 text-[7px] font-extrabold uppercase tracking-[0.04em] sm:px-3 sm:py-1.5 sm:text-[9px] sm:tracking-[0.1em] ${getStatusClasses(
        status,
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

// ============================================
// EVENT CARD
// ============================================

function EventCard({
  event,
  isFavorite,
  favoritePending,
  onToggleFavorite,
  index = 0,
  reduceMotion = false,
  now,
}) {
  const image = getEventImage(event);
  const slug = getEventSlug(event);
  const isEnded = getEventStatus(event, now) === "ended";

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -35px 0px" }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.055, 0.33),
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`group relative overflow-hidden rounded-[16px] border border-[#E5E1D8] bg-white shadow-[0_5px_20px_rgba(21,52,72,0.045)] transition-shadow duration-500 hover:shadow-[0_16px_35px_rgba(21,52,72,0.10)] active:shadow-[0_8px_22px_rgba(21,52,72,0.10)] sm:rounded-[20px] ${
        isEnded ? "opacity-60 grayscale-[0.25]" : ""
      }`}
    >
      <Link
        href={`/events/${encodeURIComponent(slug)}`}
        className="flex touch-manipulation items-stretch sm:block"
      >
        <div className="relative aspect-square w-[104px] shrink-0 overflow-hidden bg-[#EAF0F2] sm:aspect-[16/9] sm:w-full">
          {image ? (
            <img
              src={image}
              alt={getEventTitle(event)}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 group-active:scale-[1.03]"
            />
          ) : (
            <EventImage event={event} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#071F2D]/25 to-transparent" />

          <div className="absolute left-1.5 top-1.5 sm:left-3 sm:top-3">
            <div className="origin-top-left scale-[0.78] sm:scale-100">
              <EventStatus event={event} now={now} />
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 p-2.5 sm:p-4">
          <h3 className="line-clamp-2 min-h-0 pr-6 text-[11px] font-extrabold leading-[1.25] text-[#153448] transition-colors group-hover:text-[#0B5A78] sm:min-h-[44px] sm:pr-0 sm:text-[15px] sm:leading-snug">
            {getEventTitle(event)}
          </h3>

          <div className="mt-2 space-y-1 border-t border-[#EDEAE3] pt-2 sm:mt-3 sm:space-y-2 sm:pt-3">
            <p className="flex items-center gap-1.5 text-[9px] leading-[1.35] text-[#647383] sm:gap-2 sm:text-xs">
              <CalendarDays
                size={12}
                className="shrink-0 text-[#315F76] sm:h-[14px] sm:w-[14px]"
              />
              <span className="line-clamp-2">
                {getEventDateTime(event.startDate)}
              </span>
            </p>

            {event.endDate && (
              <p className="flex items-center gap-1.5 text-[9px] leading-[1.35] text-[#647383] sm:gap-2 sm:text-xs">
                <CalendarClock
                  size={12}
                  className="shrink-0 text-[#647383] sm:h-[14px] sm:w-[14px]"
                />
                <span className="line-clamp-2">
                  Ends {getEventDateTime(event.endDate)}
                </span>
              </p>
            )}

            <p className="flex items-start gap-1.5 text-[9px] leading-[1.35] text-[#647383] sm:gap-2 sm:text-xs sm:leading-5">
              <MapPin
                size={12}
                className="mt-0.5 shrink-0 text-[#315F76] sm:h-[14px] sm:w-[14px]"
              />
              <span className="line-clamp-2">
                {getEventLocation(event) || "Location to be announced"}
              </span>
            </p>

            {getEventPrice(event) && (
              <p className="text-[10px] font-bold text-[#315F76] sm:text-xs">
                {getEventPrice(event)}
              </p>
            )}
          </div>

          <div className="mt-2 hidden items-center justify-between border-t border-[#EDE7DC] pt-3 sm:mt-5 sm:flex sm:pt-4">
            <span className="text-xs font-bold text-[#153448]">
              Explore event
            </span>

            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D9E1E4] text-[#153448] transition duration-300 group-hover:border-[#315F76] group-hover:bg-[#315F76] group-hover:text-white">
              <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </Link>

      {isEnded && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#F7F2E8]/45 px-3 backdrop-blur-[2px]"
        >
          <span className="rounded-full border border-[#153448]/20 bg-[#FAF7EF]/75 px-4 py-2 text-center text-[9px] font-black tracking-[0.18em] text-[#153448]/80 shadow-sm backdrop-blur-sm sm:px-6 sm:py-3 sm:text-xs sm:tracking-[0.22em]">
            EVENT HAS ENDED
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => onToggleFavorite(event)}
        disabled={favoritePending}
        aria-label={
          isFavorite
            ? `Remove ${getEventTitle(event)} from favourites`
            : `Save ${getEventTitle(event)} to favourites`
        }
        aria-pressed={Boolean(isFavorite)}
        title={isFavorite ? "Remove from favourites" : "Save to favourites"}
        className={`absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition duration-200 active:scale-90 disabled:cursor-wait disabled:opacity-60 sm:right-4 sm:top-4 sm:h-10 sm:w-10 ${
          isFavorite
            ? "border-[#F5C45E] bg-[#FFF8EC] text-[#9B713D]"
            : "border-white/70 bg-white/90 text-[#153448] hover:border-[#F5C45E] hover:bg-[#FFF8EC] hover:text-[#9B713D]"
        }`}
      >
        {favoritePending ? (
          <LoaderCircle
            size={15}
            className="animate-spin sm:h-[17px] sm:w-[17px]"
          />
        ) : isFavorite ? (
          <BookmarkCheck size={15} className="sm:h-[18px] sm:w-[18px]" />
        ) : (
          <Bookmark size={15} className="sm:h-[18px] sm:w-[18px]" />
        )}
      </button>
    </motion.article>
  );
}

// ============================================
// FEATURED EVENT CAROUSEL
// ============================================

function FeaturedEvent({ events = [], now }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const featuredEvents = Array.isArray(events) ? events : [];

  useEffect(() => {
    if (featuredEvents.length < 2) {
      setActiveIndex(0);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % featuredEvents.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [featuredEvents.length]);

  useEffect(() => {
    setActiveIndex((current) =>
      featuredEvents.length ? current % featuredEvents.length : 0,
    );
  }, [featuredEvents.length]);

  if (!featuredEvents.length) return null;

  const activeEvent = featuredEvents[activeIndex];

  function showPrevious() {
    setActiveIndex(
      (current) =>
        (current - 1 + featuredEvents.length) % featuredEvents.length,
    );
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % featuredEvents.length);
  }

  return (
    <section aria-label="Featured experiences" className="w-full">
      <div className="relative overflow-hidden rounded-[20px] sm:rounded-[26px]">
        <div
          className="flex w-full transition-transform duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            transform: `translate3d(-${activeIndex * 100}%, 0, 0)`,
          }}
        >
          {featuredEvents.map((event) => {
            const image = getEventImage(event);

            return (
              <article
                key={getEventId(event) || getEventSlug(event)}
                aria-hidden={event !== activeEvent}
                className="relative grid min-h-[205px] w-full min-w-full shrink-0 grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] overflow-hidden rounded-[20px] bg-[#063B5C] shadow-[0_10px_28px_rgba(6,59,89,0.12)] sm:min-h-[290px] sm:rounded-[26px] lg:min-h-[350px] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
              >
                <div className="relative z-10 flex min-w-0 flex-col justify-center px-3 py-3 sm:px-7 sm:py-6 lg:px-10 lg:py-7">
                  <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full border border-white/[0.08] lg:h-64 lg:w-64" />

                  <div className="pointer-events-none absolute -bottom-32 -right-20 h-56 w-56 rounded-full border border-[#F5C45E]/15 lg:h-72 lg:w-72" />

                  <div className="relative z-10 w-full min-w-0 break-words">
                    <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#F5C45E]/35 bg-white/[0.07] px-2 py-1 text-[6px] font-extrabold uppercase tracking-[0.08em] text-[#F5C45E] sm:gap-2 sm:px-3.5 sm:py-2 sm:text-[9px] sm:tracking-[0.18em]">
                      <Sparkles size={10} />
                      Featured Experience
                    </div>

                    <div className="mt-1.5 sm:mt-3">
                      <EventStatus event={event} now={now} />
                    </div>

                    <p className="mt-1.5 line-clamp-1 break-words text-[6px] font-extrabold uppercase tracking-[0.08em] text-[#F5C45E] sm:mt-3 sm:text-[9px] sm:tracking-[0.18em] lg:text-[10px]">
                      {getCategoryLabel(event)}
                    </p>

                    <h2 className="mt-1 break-words font-serif text-[clamp(13px,3.8vw,17px)] leading-[1.08] text-white sm:mt-2 sm:text-3xl sm:leading-tight lg:max-w-xl lg:text-[36px]">
                      {getEventTitle(event)}
                    </h2>

                    <p className="mt-1 hidden line-clamp-2 break-words text-[8px] leading-[1.4] text-white/75 sm:mt-3 sm:block sm:text-sm sm:leading-5 lg:max-w-lg lg:text-[14px] lg:leading-5">
                      {event.shortDescription ||
                        event.description ||
                        "Discover an experience worth remembering in Kaduna."}
                    </p>

                    <div className="mt-1.5 space-y-1 break-words text-[7px] leading-[1.25] text-white/90 sm:mt-4 sm:space-y-2 sm:text-xs lg:text-[13px]">
                      <div className="flex items-start gap-1 sm:gap-2">
                        <CalendarDays
                          size={10}
                          className="mt-0.5 shrink-0 text-[#F5C45E] sm:h-4 sm:w-4"
                        />
                        <span>{getEventDateRange(event)}</span>
                      </div>

                      {getEventLocation(event) && (
                        <div className="flex items-start gap-1 sm:gap-2">
                          <MapPin
                            size={10}
                            className="mt-0.5 shrink-0 text-[#F5C45E] sm:h-4 sm:w-4"
                          />
                          <span className="line-clamp-2 break-words">
                            {getEventLocation(event)}
                          </span>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/events/${encodeURIComponent(getEventSlug(event))}`}
                      tabIndex={event === activeEvent ? 0 : -1}
                      className="mt-2 inline-flex w-fit max-w-full touch-manipulation items-center gap-1 self-start rounded-full bg-[#F5C45E] px-2.5 py-1.5 text-[7px] font-extrabold text-[#092F49] transition duration-300 hover:bg-[#F0DCC0] active:scale-[0.97] sm:mt-5 sm:gap-3 sm:px-5 sm:py-3 sm:text-xs lg:px-6 lg:text-sm"
                    >
                      Discover this event
                      <ArrowRight
                        size={10}
                        className="shrink-0 sm:h-4 sm:w-4"
                      />
                    </Link>
                  </div>
                </div>

                <div className="relative min-w-0 overflow-hidden bg-[#D5B72B]">
                  {image ? (
                    <img
                      src={image}
                      alt={getEventTitle(event)}
                      loading={event === activeEvent ? "eager" : "lazy"}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#063B5C] to-[#092F49]">
                      <CalendarDays
                        size={30}
                        className="text-[#F5C45E] sm:h-12 sm:w-12"
                      />
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-[#063B5C]/20 to-transparent sm:w-10" />
                </div>
              </article>
            );
          })}
        </div>

        {featuredEvents.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Previous featured experience"
              className="absolute left-1 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#092F49] shadow-lg transition hover:bg-[#FFF8EC] active:scale-90 sm:left-4 sm:h-11 sm:w-11"
            >
              <ChevronDown size={13} className="rotate-90 sm:h-5 sm:w-5" />
            </button>

            <button
              type="button"
              onClick={showNext}
              aria-label="Next featured experience"
              className="absolute right-1 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#092F49] shadow-lg transition hover:bg-[#FFF8EC] active:scale-90 sm:right-4 sm:h-11 sm:w-11"
            >
              <ChevronDown size={13} className="-rotate-90 sm:h-5 sm:w-5" />
            </button>
          </>
        )}
      </div>

      {featuredEvents.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3 sm:mt-3 sm:gap-5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {featuredEvents.map((event, index) => (
              <button
                key={getEventId(event) || getEventSlug(event)}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show featured experience ${index + 1}`}
                aria-current={activeIndex === index ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 sm:h-2 ${
                  activeIndex === index
                    ? "w-6 bg-[#F5C45E] sm:w-8"
                    : "w-1.5 bg-[#CFC7B8] hover:bg-[#8B9B91] sm:w-2"
                }`}
              />
            ))}
          </div>

          <span className="text-[8px] font-semibold tabular-nums text-[#64748B] sm:text-[11px]">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(featuredEvents.length).padStart(2, "0")}
          </span>
        </div>
      )}
    </section>
  );
}

// ============================================
// LOADING STATE
// ============================================

function EventsLoading() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[20px] border border-[#E5E1D8] bg-white"
        >
          <div className="aspect-[16/9] animate-pulse bg-[#E3E9E9]" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-[#E3E9E9]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[#E3E9E9]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[#E3E9E9]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EventsEmpty({ onReset, hasFilters }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#D9E1E4] bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF0F2] text-[#063B5C]">
        <CalendarDays size={28} />
      </div>

      <h3 className="mt-5 font-serif text-2xl text-[#092F49]">
        {hasFilters ? "No matching events" : "No events available yet"}
      </h3>

      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#64748B]">
        {hasFilters
          ? "Try changing your search or filters to discover more events."
          : "New events and experiences will appear here when they are published."}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 rounded-full bg-[#063B5C] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#063B5C]"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// ============================================
// MAIN EVENTS PAGE
// ============================================

export default function EventsPage() {
  const reduceMotion = useReducedMotion();
  const { authStatus } = useAuth();

  const [now, setNow] = useState(0);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("upcoming");

  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [pendingFavorites, setPendingFavorites] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = window.setTimeout(() => {
      setNotice("");
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    setNow(Date.now());

    const clockInterval = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => window.clearInterval(clockInterval);
  }, []);

  // ==========================================
  // LOAD EVENTS
  // ==========================================

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("events", {
        method: "GET",
      });

      const loadedEvents = extractEvents(response);

      setEvents(
        loadedEvents.filter((event) => event && event.isPublished !== false),
      );
    } catch (err) {
      console.error("Events loading error:", err);

      setEvents([]);

      setError(
        err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          "Unable to load events. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ==========================================
  // LOAD EVENT FAVOURITES
  // ==========================================

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true);

    try {
      const response = await apiRequest("event-favorites", {
        method: "GET",
      });

      const loadedFavorites = extractEventFavorites(response);

      setFavorites(loadedFavorites.map(getFavoriteEventId).filter(Boolean));
    } catch (err) {
      if (err?.status !== 401 && err?.response?.status !== 401) {
        console.error("Event favourites loading error:", err);
      }

      setFavorites([]);
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      loadFavorites();
      return;
    }

    // Guests can browse events, but their private favourites are not requested.
    if (authStatus === "unauthenticated") {
      setFavorites([]);
      setFavoritesLoading(false);
    }
  }, [authStatus, loadFavorites]);

  // ==========================================
  // EVENT FAVOURITE ACTION
  // ==========================================

  const toggleFavorite = useCallback(
    async (event) => {
      const eventId = getEventId(event);

      if (!eventId || pendingFavorites.includes(eventId)) return;

      // Do not call the protected favourites API for a guest.
      if (authStatus === "checking") return;

      if (authStatus !== "authenticated") {
        window.location.href = `/login?favoriteEvent=${encodeURIComponent(
          eventId,
        )}&returnTo=%2Fevents`;
        return;
      }

      const alreadyFavorite = favorites.includes(eventId);

      setNotice("");
      setPendingFavorites((current) => [...current, eventId]);

      try {
        if (alreadyFavorite) {
          await apiRequest(`event-favorites/${eventId}`, {
            method: "DELETE",
          });

          setFavorites((current) => current.filter((id) => id !== eventId));
          setNotice("Event removed from your favourites.");
        } else {
          await apiRequest("event-favorites", {
            method: "POST",
            body: {
              event: eventId,
            },
          });

          setFavorites((current) =>
            current.includes(eventId) ? current : [...current, eventId],
          );

          setNotice("Event added to your favourites.");
        }
      } catch (err) {
        const unauthorized =
          err?.status === 401 || err?.response?.status === 401;

        if (unauthorized) {
          window.location.href = `/login?favoriteEvent=${encodeURIComponent(
            eventId,
          )}&returnTo=%2Fevents`;

          return;
        }

        setNotice(
          err?.response?.data?.message ||
            err?.data?.message ||
            err?.message ||
            "Unable to update your event favourites.",
        );
      } finally {
        setPendingFavorites((current) =>
          current.filter((id) => id !== eventId),
        );
      }
    },
    [authStatus, favorites, pendingFavorites],
  );

  // ==========================================
  // EVENTS VISIBLE WITHIN THE 24-HOUR RETENTION WINDOW
  // ==========================================

  const visibleEvents = useMemo(
    () => events.filter((event) => getEventStatus(event, now) !== "expired"),
    [events, now],
  );

  // ==========================================
  // FILTER OPTIONS
  // ==========================================

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(visibleEvents.map((event) => event.category).filter(Boolean)),
    ];

    return uniqueCategories.map((category) => ({
      value: category,
      label: category
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    }));
  }, [visibleEvents]);

  // ==========================================
  // FILTERED EVENTS
  // ==========================================

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = visibleEvents.filter((event) => {
      const matchesSearch =
        !query ||
        [
          event.title,
          event.shortDescription,
          event.description,
          event.venue,
          event.address,
          event.city,
          event.lga,
          event.organiser,
          event.organiserName,
          event.category,
          event.categoryLabel,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCategory =
        selectedCategory === "all" || event.category === selectedCategory;

      const status = getEventStatus(event, now);

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "upcoming" &&
          (status === "upcoming" || status === "starting-soon")) ||
        (selectedStatus === "live" && status === "live") ||
        (selectedStatus === "ended" && status === "ended");

      return matchesSearch && matchesCategory && matchesStatus;
    });

    return result.sort((a, b) => {
      const startA = new Date(a.startDate || 0).getTime();
      const startB = new Date(b.startDate || 0).getTime();

      if (sortBy === "newest") {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }

      if (sortBy === "oldest") {
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      }

      if (sortBy === "rating") {
        return Number(b.averageRating || 0) - Number(a.averageRating || 0);
      }

      const statusOrder = {
        "starting-soon": 0,
        upcoming: 1,
        live: 2,
        ended: 3,
      };

      const orderA = statusOrder[getEventStatus(a, now)] ?? 4;
      const orderB = statusOrder[getEventStatus(b, now)] ?? 4;

      if (orderA !== orderB) return orderA - orderB;

      return startA - startB;
    });
  }, [visibleEvents, search, selectedCategory, selectedStatus, sortBy, now]);

  // ==========================================
  // FEATURED EVENTS
  // ==========================================

  const featuredEvents = useMemo(() => {
    return visibleEvents
      .filter(
        (event) =>
          event.isFeatured === true && getEventStatus(event, now) !== "ended",
      )
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
  }, [visibleEvents, now]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    selectedCategory !== "all" ||
    selectedStatus !== "all";

  function resetFilters() {
    setSearch("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSortBy("upcoming");
  }

  // ============================================
  // EVENT STATISTICS
  // ============================================

  const statistics = useMemo(() => {
    const upcoming = visibleEvents.filter((event) => {
      const status = getEventStatus(event, now);
      return status === "upcoming" || status === "starting-soon";
    }).length;

    const live = visibleEvents.filter(
      (event) => getEventStatus(event, now) === "live",
    ).length;

    const ended = visibleEvents.filter(
      (event) => getEventStatus(event, now) === "ended",
    ).length;

    return {
      all: visibleEvents.length,
      upcoming,
      live,
      ended,
    };
  }, [visibleEvents, now]);

  // ============================================
  // PAGE
  // ============================================

  return (
    <>
      <Header />

      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice}
            role="status"
            aria-live="polite"
            initial={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: 0, y: -18, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -12, scale: 0.98 }
            }
            transition={
              reduceMotion
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 420, damping: 32 }
            }
            className="pointer-events-none fixed left-1/2 top-[104px] z-[100] w-[calc(100%-24px)] max-w-[420px] -translate-x-1/2 sm:top-24"
          >
            <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-[#DCE9DF] bg-white/95 px-4 py-3.5 text-[#23613E] shadow-[0_14px_45px_rgba(9,47,73,0.20)] backdrop-blur-xl sm:px-5 sm:py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F6E9] text-[#238443]">
                  <CheckCircle2 size={21} strokeWidth={2.5} />
                </span>

                <p className="min-w-0 flex-1 text-[12px] font-semibold leading-5 text-[#214D35] sm:text-sm">
                  {notice}
                </p>

                <button
                  type="button"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss notification"
                  className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-[#52715D] transition-colors duration-200 hover:bg-[#EEF7EF] hover:text-[#174D2D] active:scale-90"
                >
                  <X size={17} />
                </button>
              </div>

              <motion.div
                aria-hidden="true"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 3.5, ease: "linear" }}
                className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-[#35A45A]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="min-h-screen overflow-hidden bg-[#FAF7EF]">
        {/* HERO */}
        <section className="relative isolate min-h-[250px] overflow-hidden bg-[#063B5C] sm:min-h-[320px] lg:min-h-[370px]">
          <div className="pointer-events-none absolute inset-0">
            <img
              src="/assets/images/backgrounds/events-hero.jpg"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover object-[90%_40%] sm:object-[74%_40%] lg:object-[72%_40%]"
            />

            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(6,59,92,0.94) 0%, rgba(6,59,92,0.88) 22%, rgba(6,59,92,0.72) 42%, rgba(6,59,92,0.48) 62%, rgba(6,59,92,0.28) 82%, rgba(6,59,92,0.18) 100%)",
              }}
            />

            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(6,59,92,1) 0%, rgba(6,59,92,0.98) 12%, rgba(6,59,92,0.88) 28%, rgba(6,59,92,0.65) 45%, rgba(6,59,92,0.30) 65%, transparent 85%)",
              }}
            />

            <div className="absolute -right-20 top-0 h-64 w-64 rounded-full border border-white/[0.07] sm:h-96 sm:w-96" />

            <div className="absolute -bottom-40 -left-20 h-72 w-72 rounded-full border border-[#F5C45E]/[0.07] sm:h-[420px] sm:w-[420px]" />
          </div>

          <div className="relative mx-auto flex min-h-[250px] max-w-[1440px] items-center px-5 py-5 sm:min-h-[320px] sm:px-8 sm:py-8 lg:min-h-[370px] lg:px-12 lg:py-8">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl"
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#F5C45E] sm:text-[10px]">
                Events in Kaduna
              </p>

              <h1 className="mt-2.5 max-w-3xl font-serif text-[30px] leading-[1.08] tracking-tight text-white sm:mt-3 sm:text-4xl lg:text-[48px]">
                Discover the moments that bring{" "}
                <span className="text-[#F5C45E]">Kaduna</span> alive.
              </h1>

              <p className="mt-2.5 max-w-2xl text-xs leading-5 text-white/90 sm:mt-3 sm:text-sm sm:leading-6">
                Festivals, cultural gatherings, food experiences, exhibitions
                and more — all in Kaduna State.
              </p>

              <div className="mt-4 flex flex-wrap gap-2.5 sm:mt-5 sm:gap-3">
                <a
                  href="#all-events"
                  className="inline-flex touch-manipulation items-center gap-2 rounded-full bg-[#F5C45E] px-4 py-2.5 text-[11px] font-bold text-[#092F49] transition hover:bg-[#F0DCC0] active:scale-[0.97] sm:px-6 sm:py-3.5 sm:text-sm"
                >
                  <CalendarDays size={15} />
                  Explore Events
                </a>

                <Link
                  href="/explore"
                  className="inline-flex touch-manipulation items-center gap-2 rounded-full border border-white/50 px-4 py-2.5 text-[11px] font-bold text-white transition hover:bg-white/10 active:scale-[0.97] sm:px-6 sm:py-3.5 sm:text-sm"
                >
                  <MapPin size={15} />
                  Plan Your Visit
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="border-b border-[#E8E2D7] bg-[#F7F2E8]">
          <div className="mx-auto grid max-w-[1280px] grid-cols-4 divide-x divide-[#E8E2D7] px-2 py-2 sm:px-8 sm:py-3 lg:px-12">
            {[
              {
                label: "All Events",
                value: statistics.all,
                icon: CalendarDays,
              },
              {
                label: "Upcoming",
                value: statistics.upcoming,
                icon: CalendarClock,
              },
              {
                label: "Live Now",
                value: statistics.live,
                icon: RadioTower,
              },
              {
                label: "Recently Ended",
                value: statistics.ended,
                icon: CheckCircle2,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex min-w-0 flex-row items-center justify-center gap-2 px-1 py-1 sm:gap-3 sm:px-3 sm:py-2"
                >
                  <Icon
                    size={17}
                    className="shrink-0 text-[#063B5C] sm:h-6 sm:w-6"
                  />

                  <div className="flex min-w-0 flex-col items-center text-center">
                    <p className="font-serif text-base font-bold leading-none tabular-nums text-[#092F49] sm:text-2xl">
                      {loading ? "—" : item.value}
                    </p>

                    <p className="mt-1 whitespace-nowrap text-[7px] font-semibold leading-tight text-[#64748B] sm:text-xs">
                      {item.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* EVENT CONTENT */}
        <section
          id="all-events"
          className="mx-auto max-w-[1280px] px-3 pt-3 pb-5 sm:px-8 sm:pt-8 sm:pb-12 lg:px-12 lg:pt-6 lg:pb-16"
        >
          {/* FEATURED EXPERIENCE */}
          {!loading && featuredEvents.length > 0 && !hasActiveFilters && (
            <div className="mb-5 sm:mb-6 lg:mb-7">
              <div className="mb-2.5 sm:mb-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#F5C45E] sm:text-[10px]">
                  Handpicked for you
                </p>

                <h2 className="mt-1 font-serif text-[25px] text-[#092F49] sm:mt-2 sm:text-4xl">
                  Featured Experiences
                </h2>

                <p className="mt-1.5 text-xs text-[#64748B] sm:text-sm">
                  Discover standout events and experiences worth exploring
                  across Kaduna.
                </p>
              </div>

              <FeaturedEvent events={featuredEvents} now={now} />
            </div>
          )}

          {/* EVENT LIST HEADER */}
          <div className="mb-3 flex flex-col gap-2 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[7px] font-bold uppercase tracking-[0.18em] text-[#B58B55] sm:text-[10px] sm:tracking-[0.2em]">
                Discover what is happening
              </p>

              <h2 className="mt-1 font-serif text-[21px] leading-tight text-[#153448] sm:mt-2 sm:text-3xl sm:leading-normal">
                Explore All Events
              </h2>

              <p className="mt-1 text-[9px] leading-[1.4] text-[#71818A] sm:mt-3 sm:text-sm">
                Discover events, festivals and cultural experiences happening in
                Kaduna.
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-3 sm:flex">
              <label
                htmlFor="event-sort-desktop"
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#71818A]"
              >
                Sort
              </label>

              <select
                id="event-sort-desktop"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="min-w-[175px] rounded-full border border-[#D9E1E4] bg-white px-4 py-3 text-xs font-bold text-[#153448] outline-none transition focus:border-[#315F76]"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SEARCH AND FILTERS */}
          <div className="mb-2 grid grid-cols-2 gap-2 sm:mb-8 sm:grid-cols-1 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px]">
            <div className="relative col-span-2 min-w-0 sm:col-span-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87939E] sm:left-4 sm:h-[18px] sm:w-[18px]"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search events, venues or organisers..."
                className="h-10 w-full min-w-0 rounded-full border border-[#D9E1E4] bg-white pl-9 pr-3 text-[10px] text-[#153448] outline-none transition placeholder:text-[#9AA5AA] focus:border-[#315F76] focus:ring-4 focus:ring-[#315F76]/10 sm:h-12 sm:pl-11 sm:pr-4 sm:text-sm"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              aria-label="Filter by event category"
              className="h-9 min-w-0 w-full rounded-full border border-[#D9E1E4] bg-white px-2.5 text-[9px] font-semibold text-[#153448] outline-none transition focus:border-[#315F76] sm:h-12 sm:px-4 sm:text-xs lg:col-start-2 lg:row-start-1"
            >
              <option value="all">All Categories</option>

              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              aria-label="Filter by event status"
              className="h-9 min-w-0 w-full rounded-full border border-[#D9E1E4] bg-white px-2.5 text-[9px] font-semibold text-[#153448] outline-none transition focus:border-[#315F76] sm:h-12 sm:px-4 sm:text-xs lg:col-start-3 lg:row-start-1"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live Now</option>
              <option value="ended">Recently Ended</option>
            </select>
          </div>

          {/* MOBILE SORT */}
          <div className="mb-3 flex items-center gap-2 sm:hidden">
            <label
              htmlFor="event-sort-mobile"
              className="shrink-0 text-[9px] font-semibold text-[#647383]"
            >
              Sort:
            </label>

            <select
              id="event-sort-mobile"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-8 min-w-0 rounded-full border border-[#D9E1E4] bg-white px-3 text-[9px] font-semibold text-[#153448] outline-none focus:border-[#315F76]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-red-700">{error}</p>

              <button
                type="button"
                onClick={loadEvents}
                className="w-fit rounded-full bg-red-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-800"
              >
                Try again
              </button>
            </div>
          )}

          {/* EVENT GRID */}
          {loading ? (
            <EventsLoading />
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
              {filteredEvents.map((event, index) => {
                const eventId = getEventId(event);

                return (
                  <EventCard
                    key={eventId || getEventSlug(event)}
                    event={event}
                    isFavorite={favorites.includes(eventId)}
                    favoritePending={pendingFavorites.includes(eventId)}
                    onToggleFavorite={toggleFavorite}
                    index={index}
                    reduceMotion={reduceMotion}
                    now={now}
                  />
                );
              })}
            </div>
          ) : (
            <EventsEmpty onReset={resetFilters} hasFilters={hasActiveFilters} />
          )}

          {favoritesLoading && (
            <p className="mt-4 text-center text-[10px] text-[#64748B]">
              Updating your saved events...
            </p>
          )}
        </section>
      </main>
      {/* DISCOVER MORE OF KADUNA */}
      <section className="relative overflow-hidden border-b-[3px] border-[#123D5A] bg-[#F1EFE8]">
        <div className="mx-auto flex max-w-[1800px] flex-col justify-between gap-3 px-5 py-4 sm:px-10 sm:py-5 md:px-12 lg:flex-row lg:items-center lg:gap-8 lg:px-[4%]">
          {/* LEFT CONTENT */}
          <div className="max-w-3xl">
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#C18A43] sm:text-[10px]">
              Keep exploring
            </span>

            <h2 className="mt-1 max-w-2xl font-serif text-[22px] leading-[1.2] tracking-[-0.025em] text-[#123D5A] sm:text-3xl lg:text-[36px]">
              Discover more experiences in Kaduna.
            </h2>

            <p className="mt-1 max-w-xl text-[11px] leading-[1.5] text-[#718096] sm:text-xs">
              Find more events, destinations and experiences across Kaduna
              State.
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3 lg:shrink-0">
            <Link
              href="/events"
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#123D5A] px-2 text-[10px] font-bold text-white transition-all duration-300 hover:bg-[#0B3049] active:scale-[0.97] sm:min-h-[46px] sm:gap-3 sm:px-7 sm:text-xs"
            >
              Explore events
              <ArrowRight size={14} />
            </Link>

            <Link
              href="/explore"
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#C8D3CF] bg-white px-2 text-[10px] font-bold text-[#15563F] transition-all duration-300 hover:border-[#15563F] active:scale-[0.97] sm:min-h-[46px] sm:gap-3 sm:px-7 sm:text-xs"
            >
              Explore Kaduna
              <Compass size={14} />
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
