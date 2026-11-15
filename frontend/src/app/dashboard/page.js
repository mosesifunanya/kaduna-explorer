"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Compass,
  MapPin,
  MapPinned,
  Mountain,
  RefreshCw,
  Route,
  LoaderCircle,
  UserRound,
  Settings2,
} from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

/* -------------------------------------------------------
   IMAGES
------------------------------------------------------- */

const IMAGES = {
  cover:
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85",

  explore:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85",

  saved:
    "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1000&q=85",

  trips:
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85",

  discover:
    "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=85",
};

/* -------------------------------------------------------
   DASHBOARD SHORTCUTS
------------------------------------------------------- */

const dashboardActions = [
  {
    title: "Explore destinations",
    description:
      "Discover remarkable attractions, beautiful landscapes and places worth experiencing across Kaduna State.",
    href: "/explore",
    image: IMAGES.explore,
    icon: Compass,
    label: "Explore Kaduna",
  },
  {
    title: "Saved places",
    description:
      "Return to the destinations you love and keep your favourite places close.",
    href: "/dashboard/saved",
    image: IMAGES.saved,
    icon: Bookmark,
    label: "View collection",
  },
  {
    title: "Plan your trips",
    description:
      "Bring your travel ideas together, organise your dates and build your itinerary.",
    href: "/dashboard/trips",
    image: IMAGES.trips,
    icon: CalendarDays,
    label: "Plan a journey",
  },
];

/* -------------------------------------------------------
   ANIMATIONS
------------------------------------------------------- */

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const revealVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function getInitials(name) {
  if (!name) return "";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getTripDestinations(trip) {
  return Array.isArray(trip?.destinations) ? trip.destinations : [];
}

function getFavoriteItems(response) {
  const data = response?.data;

  if (Array.isArray(data?.favorites)) return data.favorites;
  if (Array.isArray(data?.favourites)) return data.favourites;
  if (Array.isArray(data)) return data;

  return [];
}

/* -------------------------------------------------------
   PROFILE AVATAR
------------------------------------------------------- */

function ProfileAvatar({ user, large = false }) {
  const size = large
    ? "h-[76px] w-[76px] sm:h-[88px] sm:w-[88px]"
    : "h-10 w-10";

  if (user?.photo) {
    return (
      <OptimizedImage
        src={user.photo}
        alt={user.name ? `${user.name}'s profile` : "Your profile"}
        width={large ? 88 : 40}
        height={large ? 88 : 40}
        sizes={large ? "(min-width: 640px) 88px, 76px" : "40px"}
        className={`${size} shrink-0 rounded-full border-[4px] border-white bg-white object-cover shadow-[0_5px_18px_rgba(0,0,0,0.12)]`}
      />
    );
  }

  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full border-[4px] border-white bg-[#E8D7A9] font-semibold text-[#174B35] shadow-[0_5px_18px_rgba(0,0,0,0.12)] ${
        large ? "text-xl sm:text-2xl" : "text-xs"
      }`}
    >
      {getInitials(user?.name) || <UserRound size={large ? 27 : 17} />}
    </div>
  );
}

/* -------------------------------------------------------
   STATISTIC CARD
------------------------------------------------------- */

function DashboardStat({ icon: Icon, label, value, description }) {
  return (
    <motion.div
      variants={revealVariants}
      className="group rounded-[20px] border border-[#E8EDE6] bg-white p-4 transition duration-300 hover:-translate-y-1 hover:border-[#D4E1D1] hover:shadow-[0_12px_30px_rgba(26,57,37,0.07)] sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[#78877C]">{label}</span>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF3EA] text-[#376347] transition duration-300 group-hover:bg-[#174B35] group-hover:text-white">
          <Icon size={19} />
        </span>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight text-[#183B2A]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#929D93]">{description}</p>
    </motion.div>
  );
}

/* -------------------------------------------------------
   SECTION HEADING
------------------------------------------------------- */

function SectionHeading({ eyebrow, title, description, href, linkLabel }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#8A9B8D] sm:text-xs">
          {eyebrow}
        </p>

        <h2 className="mt-2 font-serif text-[27px] leading-tight text-[#183B2A] sm:text-3xl">
          {title}
        </h2>

        {description && (
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#829087]">
            {description}
          </p>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 self-start text-sm font-semibold text-[#376347] transition hover:text-[#A27A35] sm:self-auto"
        >
          {linkLabel}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   MAIN DASHBOARD
------------------------------------------------------- */

export default function DashboardPage() {
  const reduceMotion = useReducedMotion();
  const { user, authStatus } = useAuth();

  const [trips, setTrips] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* -----------------------------------------------------
     LOAD REAL DASHBOARD DATA
  ----------------------------------------------------- */

  const loadDashboard = useCallback(async () => {
    // Wait for the shared provider to finish checking the current session.
    if (authStatus === "checking") return;

    // Dashboard data belongs to signed-in users. Do not make protected API
    // requests when there is no authenticated session.
    if (authStatus !== "authenticated") {
      setTrips([]);
      setFavorites([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      apiRequest("/trips"),
      apiRequest("/favorites"),
    ]);

    const [tripsResult, favoritesResult] = results;

    let failedRequests = 0;

    if (tripsResult.status === "fulfilled") {
      const items = tripsResult.value?.data?.trips;

      setTrips(Array.isArray(items) ? items : []);
    } else {
      setTrips([]);
      failedRequests += 1;
    }

    if (favoritesResult.status === "fulfilled") {
      setFavorites(getFavoriteItems(favoritesResult.value));
    } else {
      setFavorites([]);
      failedRequests += 1;
    }

    if (failedRequests === 2) {
      setError("We couldn't load your dashboard information.");
    } else if (failedRequests > 0) {
      setError(
        "Some dashboard information could not be loaded. Please try again.",
      );
    }

    setLoading(false);
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== "checking") {
      loadDashboard();
    }
  }, [authStatus, loadDashboard]);

  /* -----------------------------------------------------
     DERIVED DATA
  ----------------------------------------------------- */

  const totalDestinations = useMemo(
    () =>
      trips.reduce(
        (total, trip) => total + getTripDestinations(trip).length,
        0,
      ),
    [trips],
  );

  const upcomingTrips = useMemo(
    () =>
      trips.filter(
        (trip) => trip.status === "planned" || trip.status === "ongoing",
      ),
    [trips],
  );

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

  const firstName = user?.name?.trim().split(/\s+/)[0];

  /* -----------------------------------------------------
     PAGE
  ----------------------------------------------------- */

  return (
    <main className="min-h-screen overflow-x-clip bg-[#F8F9F5] text-[#183B2A]">
      <Header activeNav="plan-trip" />

      <div className="mx-auto w-full max-w-[1440px] px-4 pb-14 pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pb-20">
        {/* VISITOR PROFILE */}

        <motion.section
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          variants={revealVariants}
          className="overflow-hidden rounded-[24px] border border-[#E7ECE4] bg-white shadow-[0_12px_38px_rgba(26,57,37,0.055)] sm:rounded-[28px]"
        >
          {/* COVER IMAGE */}

          <div className="relative z-0 h-[135px] overflow-hidden bg-[#174B35] sm:h-[170px] lg:h-[190px]">
            <img
              src={IMAGES.cover}
              alt="Scenic Kaduna landscape"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-[#103C2A]/65 via-[#103C2A]/25 to-transparent" />

            <div className="absolute inset-0 bg-gradient-to-t from-[#103C2A]/35 to-transparent" />

            <div className="absolute left-5 top-5 flex items-center gap-2 sm:left-8 sm:top-7">
              <Compass size={15} className="text-[#E8D7A9]" />

              <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-white sm:text-xs">
                Your travel profile
              </span>
            </div>
          </div>

          {/* PROFILE BODY */}

          <div className="relative z-10 bg-white px-5 pb-5 pt-5 sm:px-8 sm:pb-7">
            {/* IDENTITY ROW */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {/* AVATAR + USER DETAILS */}

              <div className="relative flex min-w-0 items-start">
                {/* ONLY THE AVATAR OVERLAPS THE BANNER */}

                <div className="absolute -top-[62px] left-0 z-20 sm:-top-[72px]">
                  <ProfileAvatar user={user} large />
                </div>

                {/* RESERVED SPACE FOR AVATAR */}

                <div className="min-h-[76px] w-full pl-[96px] sm:min-h-[88px] sm:pl-[108px]">
                  <div className="min-w-0 pt-0">
                    <p className="break-words text-lg font-semibold leading-tight tracking-tight text-[#183B2A] sm:text-2xl">
                      {loading
                        ? "Loading profile..."
                        : user?.name || "Your travel profile"}
                    </p>

                    <p className="mt-2 break-all text-xs text-[#829087] sm:text-sm">
                      {user?.email || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* EDIT PROFILE BUTTON */}

              <Link
                href="/dashboard/settings"
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-[#DCE6D9] bg-white px-4 text-xs font-semibold text-[#315D3D] transition duration-200 hover:border-[#174B35] hover:bg-[#F4F7F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#376347] focus-visible:ring-offset-2"
              >
                <Settings2 size={15} />
                Edit profile
              </Link>
            </div>

            {/* ACCOUNT INFORMATION */}

            <div className="mt-5 flex flex-col gap-3 border-t border-[#EDF0EA] pt-4 sm:mt-6 sm:flex-row sm:items-center sm:gap-6">
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#376347] transition hover:text-[#A27A35]"
              >
                Manage account
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </motion.section>

        {/* DASHBOARD ERROR */}

        {error && (
          <div
            role="alert"
            className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 font-semibold transition hover:bg-amber-100"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        )}

        {/* TRAVEL OVERVIEW */}

        <section className="mt-9 sm:mt-11">
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={revealVariants}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#8A9B8D] sm:text-xs">
              Your travel overview
            </p>

            <div className="mt-2 flex flex-col gap-2">
              <h1 className="font-serif text-[30px] leading-tight tracking-tight text-[#183B2A] sm:text-4xl">
                {firstName
                  ? `${firstName}'s journeys`
                  : "Your journeys at a glance"}
              </h1>

              <p className="max-w-xl text-sm leading-6 text-[#829087]">
                A little overview of the places and travel plans you've saved.
              </p>
            </div>
          </motion.div>

          {/* STATISTICS */}

          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={containerVariants}
            className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
          >
            <DashboardStat
              icon={Route}
              label="My trips"
              value={loading ? "—" : trips.length}
              description="Your travel plans"
            />

            <DashboardStat
              icon={Bookmark}
              label="Saved places"
              value={loading ? "—" : favorites.length}
              description="Your favourite destinations"
            />

            <DashboardStat
              icon={MapPinned}
              label="Trip destinations"
              value={loading ? "—" : totalDestinations}
              description="Places in your itineraries"
            />
          </motion.div>
        </section>

        {/* QUICK ACCESS */}

        <section className="mt-11 sm:mt-14">
          <SectionHeading
            eyebrow="Your travel space"
            title="Where would you like to go?"
            description="Everything you need to discover places and organise your Kaduna adventures."
          />

          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
          >
            {dashboardActions.map((action) => {
              const Icon = action.icon;

              return (
                <motion.div
                  key={action.title}
                  variants={revealVariants}
                  className="min-w-0"
                >
                  <Link
                    href={action.href}
                    className="group block h-full overflow-hidden rounded-[22px] border border-[#E5EAE2] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#CCDACA] hover:shadow-[0_15px_35px_rgba(26,57,37,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#376347] focus-visible:ring-offset-2"
                  >
                    <div className="relative h-40 overflow-hidden sm:h-48">
                      <img
                        src={action.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-[#102F24]/55 via-transparent to-transparent" />

                      <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-white/90 text-[#174B35] shadow-lg backdrop-blur-sm transition duration-300 group-hover:bg-[#E8D7A9]">
                        <Icon size={21} />
                      </div>
                    </div>

                    <div className="flex min-h-[180px] flex-col p-5 sm:p-6">
                      <h3 className="font-serif text-2xl text-[#183B2A]">
                        {action.title}
                      </h3>

                      <p className="mt-2 flex-1 text-sm leading-6 text-[#829087]">
                        {action.description}
                      </p>

                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#376347] transition group-hover:text-[#A27A35]">
                        {action.label}

                        <ArrowRight
                          size={16}
                          className="transition duration-300 group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* UPCOMING AND RECENT TRIPS */}

        <section className="mt-11 grid grid-cols-1 gap-5 lg:mt-14 lg:grid-cols-[1.15fr_0.85fr]">
          {/* UPCOMING TRIPS */}

          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={revealVariants}
            className="min-w-0 rounded-[22px] border border-[#E5EAE2] bg-white p-5 sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A9B8D]">
                  Your itinerary
                </p>

                <h2 className="mt-2 font-serif text-2xl text-[#183B2A] sm:text-3xl">
                  Upcoming journeys
                </h2>
              </div>

              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF3EA] text-[#376347]">
                <CalendarDays size={19} />
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-[#89968C]">
                <LoaderCircle size={18} className="animate-spin" />
                Loading journeys...
              </div>
            ) : upcomingTrips.length > 0 ? (
              <div className="mt-6 space-y-3">
                {upcomingTrips.slice(0, 3).map((trip) => (
                  <div
                    key={trip._id}
                    className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#F7F9F5] p-4 transition duration-300 hover:bg-[#EFF4EC]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#376347] shadow-sm">
                      <Route size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#31533C]">
                        {trip.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-[#89968C]">
                        {formatDate(trip.startDate)} –{" "}
                        {formatDate(trip.endDate)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold capitalize text-[#55765B]">
                      {trip.status}
                    </span>
                  </div>
                ))}

                <Link
                  href="/dashboard/trips"
                  className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#376347] transition hover:text-[#A27A35]"
                >
                  View all trips
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-[#F7F9F5] px-5 py-7 text-center">
                <CalendarDays size={27} className="mx-auto text-[#819783]" />

                <p className="mt-3 text-sm font-semibold text-[#526D59]">
                  No upcoming trips yet
                </p>

                <p className="mt-1 text-xs leading-5 text-[#89968C]">
                  Your planned journeys will appear here.
                </p>

                <Link
                  href="/dashboard/trips"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#376347] hover:text-[#A27A35]"
                >
                  Start planning
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </motion.div>

          {/* RECENT ACTIVITY */}

          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={revealVariants}
            className="min-w-0 rounded-[22px] border border-[#E5EAE2] bg-white p-5 sm:p-7"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A9B8D]">
              Your travel history
            </p>

            <h2 className="mt-2 font-serif text-2xl text-[#183B2A] sm:text-3xl">
              Recently updated
            </h2>

            {loading ? (
              <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-[#89968C]">
                <LoaderCircle size={18} className="animate-spin" />
                Loading activity...
              </div>
            ) : recentTrips.length > 0 ? (
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

                <Link
                  href="/dashboard/trips"
                  className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#376347] transition hover:text-[#A27A35]"
                >
                  Manage your trips
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-[#F7F9F5] px-5 py-7 text-center">
                <Compass size={27} className="mx-auto text-[#819783]" />

                <p className="mt-3 text-sm font-semibold text-[#526D59]">
                  Your travel activity will appear here
                </p>

                <p className="mt-1 text-xs leading-5 text-[#89968C]">
                  Create a trip to begin building your travel history.
                </p>
              </div>
            )}
          </motion.div>
        </section>

        {/* DISCOVER KADUNA */}

        <motion.section
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={revealVariants}
          className="relative isolate mt-8 overflow-hidden rounded-[24px] bg-[#174B35] sm:mt-10"
        >
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center opacity-35"
            style={{
              backgroundImage: `url("${IMAGES.discover}")`,
            }}
          />

          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#103C2A]/95 via-[#174B35]/85 to-[#174B35]/55" />

          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-[#E8D7A9] backdrop-blur-sm">
                <Mountain size={24} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8D7A9]">
                  More experiences await
                </p>

                <h2 className="mt-2 font-serif text-2xl text-white sm:text-3xl">
                  There's more to discover.
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
                  Explore the landscapes, cultural landmarks and experiences
                  that make Kaduna worth discovering.
                </p>
              </div>
            </div>

            <Link
              href="/explore"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[#E8D7A9] px-5 py-3 text-sm font-bold text-[#173D2D] transition hover:-translate-y-0.5 hover:bg-white sm:self-center"
            >
              Discover Kaduna
              <ArrowRight size={17} />
            </Link>
          </div>
        </motion.section>
      </div>

      <Footer />
    </main>
  );
}
