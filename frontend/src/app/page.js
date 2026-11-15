"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import Image from "next/image";

import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  MapPin,
  MapPinned,
  Search,
  Sparkles,
  Star,
  Mountain,
  CalendarDays,
  Landmark,
  Users,
  Store,
  Plus,
  Minus,
  Heart,
} from "lucide-react";

import Header from "@/components/Header";

import Footer from "@/components/Footer";

import {
  categories,
  heroContent,
  services,
  aboutContent,
} from "@/lib/homeData";

import { apiRequest } from "@/lib/api";
import {
  getCachedHomepageData,
  setCachedHomepageData,
} from "@/lib/publicDestinationCache";

import { normalizeDestination } from "@/lib/destinationUtils";

import DestinationFavorite from "@/components/destination-details/DestinationFavorite";
import { useRouteTransition } from "@/components/RouteTransitionProvider";

function getCloudinaryImageUrl(src, width) {
  if (typeof src !== "string" || !src.trim()) return src;

  try {
    const url = new URL(src);

    if (
      url.hostname !== "res.cloudinary.com" ||
      !url.pathname.includes("/image/upload/")
    ) {
      return src;
    }

    const uploadMarker = "/image/upload/";
    const markerIndex = url.pathname.indexOf(uploadMarker);
    const pathAfterUpload = url.pathname.slice(
      markerIndex + uploadMarker.length,
    );
    const firstSegment = pathAfterUpload.split("/")[0];

    // Avoid adding a second transformation to URLs already transformed.
    if (/^(?:f_|q_|w_|h_|c_|dpr_|g_|ar_|e_|fl_)/.test(firstSegment)) {
      return src;
    }

    url.pathname = url.pathname.replace(
      uploadMarker,
      `${uploadMarker}f_auto,q_auto,w_${width},c_limit/`,
    );

    return url.toString();
  } catch {
    return src;
  }
}

function getCloudinaryImageSrcSet(src) {
  if (typeof src !== "string" || !src.trim()) return undefined;

  try {
    const url = new URL(src);
    const uploadMarker = "/image/upload/";
    const markerIndex = url.pathname.indexOf(uploadMarker);

    if (url.hostname !== "res.cloudinary.com" || markerIndex === -1) {
      return undefined;
    }

    const pathAfterUpload = url.pathname.slice(
      markerIndex + uploadMarker.length,
    );
    const firstSegment = pathAfterUpload.split("/")[0];

    // Keep URLs with existing transformations unchanged.
    if (/^(?:f_|q_|w_|h_|c_|dpr_|g_|ar_|e_|fl_)/.test(firstSegment)) {
      return undefined;
    }

    const widths = [320, 480, 640, 750, 828, 960, 1080, 1200, 1440, 1920];

    return widths
      .map((width) => {
        const candidate = new URL(src);
        candidate.pathname = candidate.pathname.replace(
          uploadMarker,
          `${uploadMarker}f_auto,q_auto,w_${width},c_limit/`,
        );
        return `${candidate.toString()} ${width}w`;
      })
      .join(", ");
  } catch {
    return undefined;
  }
}

function extractHomepage(response) {
  return (
    response?.data?.homepage ||
    response?.data?.data?.homepage ||
    response?.homepage ||
    null
  );
}

function extractList(response, key) {
  const candidates = [
    response?.data?.[key],

    response?.data?.data?.[key],

    response?.[key],
  ];

  return candidates.find(Array.isArray) || [];
}

function getReviewAuthor(review) {
  const user = review?.user || {};

  return {
    name: user.name || "Kaduna Explorer visitor",

    photo: user.photo || "",
  };
}

function getDestinationImageUrl(destination) {
  const getUrl = (value) => {
    if (typeof value === "string") return value.trim();

    if (!value || typeof value !== "object") return "";

    return (
      (typeof value.url === "string" && value.url.trim()) ||
      (typeof value.secure_url === "string" && value.secure_url.trim()) ||
      (typeof value.src === "string" && value.src.trim()) ||
      (typeof value.image === "string" && value.image.trim()) ||
      ""
    );
  };

  const images = Array.isArray(destination?.images) ? destination.images : [];

  const markedCover = images.find(
    (image) => image?.isCover || image?.isFeatured || image?.isPrimary,
  );

  return (
    getUrl(destination) ||
    getUrl(destination?.coverImage) ||
    getUrl(markedCover) ||
    getUrl(images[0]) ||
    getUrl(destination?.image) ||
    getUrl(destination?.thumbnail) ||
    ""
  );
}

function Reveal({ children, className = "", delay = 0 }) {
  return (
    <div
      className={`home-reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { startNavigation } = useRouteTransition();
  const navigateTo = useCallback(
    (href, options) => {
      startNavigation(href);
      router.push(href, options);
    },
    [router, startNavigation],
  );

  const reviewTrackRef = useRef(null);

  const [locationLoading, setLocationLoading] = useState(false);

  const [homepage, setHomepage] = useState(null);
  const [homepageLoading, setHomepageLoading] = useState(true);

  const [destinations, setDestinations] = useState([]);

  const [destinationsLoading, setDestinationsLoading] = useState(true);

  const [destinationsError, setDestinationsError] = useState("");

  const [reviews, setReviews] = useState([]);

  const [reviewStats, setReviewStats] = useState({
    averageRating: 0,

    totalReviews: 0,
  });

  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [openFaq, setOpenFaq] = useState(-1);
  const [activeAboutImage, setActiveAboutImage] = useState(0);
  const aboutGalleryRef = useRef(null);
  const [aboutGalleryWidth, setAboutGalleryWidth] = useState(0);
  /* SCROLL REVEAL */

  // Enable reveal styling before the browser paints hydrated content. Elements
  // already in the viewport are shown immediately; off-screen elements reveal
  // as the visitor scrolls. Without JavaScript, homepage content stays visible.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("home-reveal-ready");

    return () => root.classList.remove("home-reveal-ready");
  }, []);

  useLayoutEffect(() => {
    const nodes = document.querySelectorAll(
      "#home .home-reveal:not(.is-visible)",
    );

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -24px 0px",
      },
    );

    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const alreadyInView = rect.top < window.innerHeight && rect.bottom > 0;

      if (alreadyInView) {
        node.classList.add("is-visible");
      } else {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [homepage, destinations, reviews]);

  /* LOAD ADMIN-MANAGED HOMEPAGE CONTENT */

  const loadHomepage = useCallback(async () => {
    try {
      const response = await apiRequest("homepage");

      const content = extractHomepage(response);

      if (content && typeof content === "object") {
        setHomepage(content);
        setCachedHomepageData({ homepage: content });
      }
    } catch (error) {
      console.error("Failed to load homepage content:", error);
    } finally {
      setHomepageLoading(false);
    }
  }, []);

  /* LOAD FEATURED DESTINATIONS, WITH A PUBLISHED-DESTINATION FALLBACK */

  const loadDestinations = useCallback(async () => {
    setDestinationsError("");

    try {
      let records = [];

      try {
        const featuredResponse = await apiRequest("destinations/featured");

        records = extractList(featuredResponse, "destinations");
      } catch (featuredError) {
        // Older admin data may not yet contain featured selections.

        // The public destination list below keeps the homepage populated.

        console.warn(
          "Featured destinations are unavailable; loading published destinations instead.",

          featuredError,
        );
      }

      if (!records.length) {
        const publicResponse = await apiRequest("destinations");

        records = extractList(publicResponse, "destinations");
      }

      const normalized = records

        .filter((item) => item && item.isPublished !== false)

        .sort((a, b) => {
          const orderA = Number(a.featuredOrder) || Number.MAX_SAFE_INTEGER;

          const orderB = Number(b.featuredOrder) || Number.MAX_SAFE_INTEGER;

          return orderA - orderB;
        })

        .map((item, index) => normalizeDestination(item, index));

      const homepageDestinations = normalized.slice(0, 4);
      setDestinations(homepageDestinations);
      setCachedHomepageData({ destinations: homepageDestinations });
    } catch (error) {
      console.error("Failed to load homepage destinations:", error);

      setDestinationsError(error?.message || "We could not load destinations.");
    } finally {
      setDestinationsLoading(false);
    }
  }, []);

  /* LOAD REAL VISITOR REVIEWS */

  const loadReviews = useCallback(async () => {
    try {
      const response = await apiRequest("reviews?page=1&limit=20&sort=newest");

      const records = extractList(response, "reviews");

      const homepageReviews = records.filter((item) => item && item.review);
      const homepageReviewStats = response?.data?.statistics ||
        response?.statistics || {
          averageRating: 0,
          totalReviews: 0,
        };

      setReviews(homepageReviews);
      setReviewStats(homepageReviewStats);
      setCachedHomepageData({
        reviews: homepageReviews,
        reviewStats: homepageReviewStats,
      });
    } catch (error) {
      // Keep previously cached reviews visible if the background refresh fails.
      console.error("Failed to refresh homepage reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  // Read saved homepage data before the first hydrated browser paint. This
  // prevents returning visitors from seeing empty sections while React waits
  // for a normal effect to run.
  useLayoutEffect(() => {
    const cachedHomepageData = getCachedHomepageData();
    if (!cachedHomepageData) return;

    if (
      cachedHomepageData.homepage &&
      typeof cachedHomepageData.homepage === "object"
    ) {
      setHomepage(cachedHomepageData.homepage);
      setHomepageLoading(false);
    }

    if (Array.isArray(cachedHomepageData.destinations)) {
      setDestinations(cachedHomepageData.destinations);
      setDestinationsLoading(false);
    }

    if (Array.isArray(cachedHomepageData.reviews)) {
      setReviews(cachedHomepageData.reviews);
      setReviewsLoading(false);
    }

    if (
      cachedHomepageData.reviewStats &&
      typeof cachedHomepageData.reviewStats === "object"
    ) {
      setReviewStats(cachedHomepageData.reviewStats);
    }
  }, []);

  useEffect(() => {
    // Refresh quietly in the background; cached content stays on screen.
    loadHomepage();
    loadDestinations();
    loadReviews();
  }, [loadHomepage, loadDestinations, loadReviews]);

  /* ADMIN-MANAGED CONTENT */

  const currentAbout = {
    ...aboutContent,

    ...(homepage?.about || {}),
  };

  const categoriesForDisplay = useMemo(() => {
    if (Array.isArray(homepage?.categories)) {
      return homepage.categories

        .filter((item) => item?.isVisible !== false)

        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }

    return categories.map((item) => ({
      name: item.name,

      slug: item.filter,

      description: "Discover places across Kaduna",

      image: null,

      isVisible: true,
    }));
  }, [homepage]);

  const faqs = useMemo(
    () =>
      (homepage?.faqs || [])

        .filter(
          (item) => item?.isVisible !== false && item.question && item.answer,
        )

        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),

    [homepage],
  );

  const aboutGallery = (
    Array.isArray(currentAbout.gallery) ? currentAbout.gallery : []
  )
    .map((item) => ({
      ...(typeof item === "object" && item !== null ? item : {}),
      url: getDestinationImageUrl(item),
    }))
    .filter((item) => item.url);

  useEffect(() => {
    const element = aboutGalleryRef.current;
    if (!element) return undefined;

    const updateWidth = () => {
      setAboutGalleryWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const aboutCylinderFaceCount =
    aboutGallery.length > 0 && aboutGallery.length < 5
      ? aboutGallery.length * 2
      : aboutGallery.length;
  const aboutCylinderStep =
    aboutCylinderFaceCount > 0 ? 360 / aboutCylinderFaceCount : 0;
  const aboutCylinderPanelWidth = aboutGalleryWidth * 0.54;
  const aboutCylinderRadius =
    aboutCylinderFaceCount > 2
      ? ((aboutCylinderPanelWidth || 190) /
          (2 * Math.tan(Math.PI / aboutCylinderFaceCount))) *
        (aboutGalleryWidth <= 230 ? 1.06 : 1.04)
      : 0;

  useEffect(() => {
    setActiveAboutImage((current) =>
      aboutGallery.length ? current % aboutGallery.length : 0,
    );
  }, [aboutGallery.length]);

  useEffect(() => {
    if (aboutGallery.length < 2) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const rotation = window.setInterval(() => {
      setActiveAboutImage((current) => (current + 1) % aboutGallery.length);
    }, 4500);

    return () => window.clearInterval(rotation);
  }, [aboutGallery.length]);

  const destinationPreviewImages = [
    ...destinations.map((destination) => ({
      url: getDestinationImageUrl(destination),

      alt: destination.name || "Kaduna destination",
    })),

    ...aboutGallery,

    ...categoriesForDisplay.map((category) => ({
      url: getDestinationImageUrl(category.image),

      alt: category.name || "Kaduna destination",
    })),
  ]

    .filter((item) => item.url)

    .filter(
      (item, index, all) =>
        all.findIndex((candidate) => candidate.url === item.url) === index,
    )

    .slice(0, 3);

  /* NAVIGATION */

  function selectCategory(category) {
    const params = new URLSearchParams();

    if (category && category !== "All" && category !== "all") {
      params.set("category", category);
    }

    navigateTo(
      params.toString() ? `/explore?${params.toString()}` : "/explore",
    );
  }

  /* FIND NEARBY PLACES */

  function findNearby() {
    if (!navigator.geolocation) {
      window.alert(
        "Your browser does not support location access. You can still search by place or area.",
      );

      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const params = new URLSearchParams({
          nearby: "true",

          lat: String(position.coords.latitude),

          lng: String(position.coords.longitude),
        });

        setLocationLoading(false);

        navigateTo(`/explore?${params.toString()}`);
      },

      (error) => {
        setLocationLoading(false);

        window.alert(
          error.code === error.PERMISSION_DENIED
            ? "Location access was not granted. You can still search for places by name or area."
            : "We could not determine your location. Please try again.",
        );
      },

      {
        enableHighAccuracy: true,

        timeout: 10000,

        maximumAge: 60000,
      },
    );
  }

  /* REVIEW CAROUSEL: MOVE EXACTLY FOUR REVIEWS PER CLICK */

  const scrollReviews = (direction) => {
    const track = reviewTrackRef.current;

    const firstCard = track?.querySelector(".home-review-card");

    if (!track || !firstCard) return;

    const styles = window.getComputedStyle(track);

    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;

    const cardWidth = firstCard.getBoundingClientRect().width;
    const visibleCards = Math.max(
      1,
      Math.floor((track.clientWidth + gap) / (cardWidth + gap)),
    );

    track.scrollBy({
      left: direction * (cardWidth + gap) * visibleCards,
      behavior: "smooth",
    });
  };

  return (
    <main
      id="home"
      className="min-h-screen overflow-x-clip bg-[#E7DBA1] pb-16 font-sans text-[#102D25] antialiased sm:pb-0"
    >
      <style jsx global>{`

        .home-content {

          width: 100%;

          max-width: 1320px;

          margin-inline: auto;

        }



        @media (min-width: 1024px) {

          .home-content {

            width: min(82%, 1320px);

          }

        }
        /* Reveal is enabled only after hydration; no-JS content stays visible. */
        #home .home-reveal {
          opacity: 1;
          transform: none;
        }
        html.home-reveal-ready #home .home-reveal:not(.is-visible) {
          opacity: 0;
          transform: translate3d(0, 18px, 0);
        }
        html.home-reveal-ready #home .home-reveal {
          transition:
            opacity 650ms ease,
            transform 650ms cubic-bezier(0.2, 0.75, 0.25, 1);
          transition-delay: var(--reveal-delay, 0ms);
          will-change: opacity, transform;
        }
        html.home-reveal-ready #home .home-reveal.is-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }



        /* Homepage hero styles are maintained in app/globals.css. */

                .home-categories-glow {

          background: radial-gradient(

            ellipse at 48% 100%,

            rgba(255, 238, 155, 0.42),

            transparent 45%

          );

        }



        .home-category-card {

          background: transparent !important;

          border: 0 !important;

          box-shadow: none !important;

          padding: 0 !important;

          appearance: none;

        }

        section.home-categories button.home-category-card,
        section.home-categories button.home-category-card:hover,
        section.home-categories button.home-category-card:focus,
        section.home-categories button.home-category-card:active {
          background: transparent !important;
          background-color: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }



        .home-category-card-underline {

          transition: transform 350ms cubic-bezier(0.22, 1, 0.36, 1);

        }



        *.home-category-card:hover* .home-category-card-underline {

          transform: scaleX(1.06);

        }



        .home-category-image img,

        .home-about img {

          will-change: transform;

        }



        @media (max-width: 639px) {

          .home-category-title {
            max-width: 11ch;
          }



          .home-kaduna-line-art {

            display: none;

          }

        }



        .home-categories butto&#x6E;*:focus-visible*,

        .home-discover butto&#x6E;*:focus-visible*,

        .home-faq butto&#x6E;*:focus-visible* {

          outline: 3px solid #ffbd4a;

          outline-offset: 4px;

        }



        .home-about-gallery {
          perspective: 1100px;
          perspective-origin: 50% 48%;
          isolation: isolate;
          overflow: visible;
        }

        .home-about-collage {
          position: relative;
          isolation: isolate;
          transform-style: preserve-3d;
          perspective: 1100px;
        }

        .home-about-cylinder {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          transition: transform 1350ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }

        .home-about-photo {
          position: absolute;
          top: 5%;
          left: 23%;
          width: 54%;
          height: 90%;
          overflow: hidden;
          border: 5px solid #D4A900;
          border-radius: 2px;
          background: #E7EBDD;
          box-shadow: 0 22px 48px rgba(16, 45, 37, 0.22);
          backface-visibility: hidden;
          transform-style: preserve-3d;
          transition: box-shadow 500ms ease;
        }

        .home-about-photo img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          user-select: none;
          -webkit-user-drag: none;
        }

        @media (min-width: 640px) {
          .home-about-photo {
            border-width: 7px;
          }
        }

        .home-about-photo-center {
          box-shadow: 0 30px 62px rgba(16, 45, 37, 0.3);
        }

        .home-about-signature {
          isolation: isolate;
        }

        .home-about-signature-copy {
          white-space: nowrap;
          font-family: "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive;
          font-size: clamp(1.7rem, 3.2vw, 2.8rem);
          font-style: italic;
          font-weight: 500;
          letter-spacing: -0.065em;
          line-height: 0.98;
          color: #164A2B;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .home-about-signature-flourish {
          overflow: visible;
          opacity: 0.95;
        }

        @media (min-width: 640px) and (max-width: 1023px) {
          .home-content {
            width: 100%;
            max-width: 760px;
          }
        }

        @media (max-width: 639px) {
          /* About section: mobile-only composition matching the approved mockup. */
          #about.home-about {
            padding: 24px 16px 22px;
            background: linear-gradient(180deg, #fffdf7 0%, #fffaf0 100%);
          }

          #about.home-about > .home-content > .grid {
            gap: 18px;
          }

          #about .home-about-feature-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 10px;
            margin-top: 16px;
          }

          #about .home-about-feature {
            display: grid;
            grid-template-columns: 52px minmax(0, 1fr);
            grid-template-rows: auto auto;
            align-items: center;
            column-gap: 12px;
            row-gap: 3px;
            min-height: 84px;
            padding: 11px 12px;
            border-radius: 19px;
            background: rgba(255, 255, 255, 0.58);
            box-shadow: 0 3px 12px rgba(28, 66, 42, 0.045);
          }

          #about .home-about-feature > span {
            grid-column: 1;
            grid-row: 1 / span 2;
            width: 48px;
            height: 48px;
            margin: 0;
            border-radius: 14px;
            box-shadow: 0 3px 8px rgba(38, 115, 20, 0.16);
          }

          #about .home-about-feature > h3 {
            grid-column: 2;
            grid-row: 1;
            align-self: end;
            margin: 0;
            font-size: 15px;
            line-height: 1.15;
          }

          #about .home-about-feature > p {
            grid-column: 2;
            grid-row: 2;
            align-self: start;
            margin: 0;
            font-size: 12px;
            line-height: 1.35;
          }

          #about .home-about-flight {
            display: block;
            height: 38px;
            margin-top: 14px;
            margin-bottom: 2px;
          }

          #about .home-about-flight svg {
            overflow: visible;
          }

          #about .home-about-feature-grid + div {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            margin-top: 16px;
          }

        #about .home-about-feature-grid + div > button:first-child {
  width: 88%;
  max-width: 340px;
  min-height: 20px;
  align-self: center;
  justify-content: center;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
  box-shadow: 0 7px 16px rgba(0, 76, 36, 0.16);
}

          #about .home-about-gallery {
            width: 100%;
            height: 220px;
            max-width: 230px;
            margin-top: 22px;
            margin-bottom: 0;
            perspective: 820px;
            transform: none;
            transform-origin: top center;
          }

          /* Keep the decorative arc visible behind the mobile 3D gallery. */
          #about .home-about-gallery > svg:first-child {
            display: block;
            top: -17%;
            left: -27%;
            width: 124%;
            height: 88%;
          }

          #about .home-about-collage {
            overflow: visible;
          }

          #about .home-about-photo {
            width: 54%;
            height: 90%;
            top: 5%;
            left: 23%;
            border-width: 3px;
            border-radius: 3px;
            box-shadow: 0 9px 20px rgba(16, 45, 37, 0.18);
          }


/* Mobile destination labels */
#about .home-about-photo > div {
  bottom: -5px;
  padding-bottom: 8px;
}

#about .home-about-photo > div > span {
  padding: 6px 7px;
  font-size: 9px;
  font-weight: 900;
  gap: 4px;
  letter-spacing: 0;
  text-shadow: none;
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
}

#about .home-about-photo > div > span > span {
  transform: translateZ(1px);
  backface-visibility: hidden;
}

#about .home-about-photo > div > span svg {
  width: 11px;
  height: 11px;
}


          #about .home-about-photo-center {
            border-width: 4px;
            box-shadow: 0 12px 24px rgba(16, 45, 37, 0.23);
          }

          #about .home-about-gallery-controls {
            bottom: -13%;
            gap: 47px;

          }

         #about .home-about-gallery-controls button {
  width: 25px;
  height: 25px;
  border-color: #E8C94A;
  background: #FFF0A6;
  color: #07552F;
  box-shadow: 0 4px 12px rgba(16, 45, 37, 0.12);
}

          #about .home-about-signature {
            width: 100%;
            max-width: 320px;
            margin-top: 44px;
            padding-top: 2px;
            padding-bottom: 0;
            gap: 7px;
          }

          #about .home-about-signature-flourish {
            display: block;
            width: 40px;
            height: 25px;
            min-width: 40px;
            flex: 0 0 40px;
          }

          .home-about-signature-copy {
            font-size: clamp(1.18rem, 5.5vw, 1.45rem);
          }

          #about .home-about-signature > div {
            padding-inline: 0;
          }
        }

        .home-faq::before {
          content: none;
          display: none;
        }

        .home-faq {
          background-color: #064B4B;
          background-image:
            radial-gradient(ellipse at 8% 8%, rgba(4, 56, 51, 0.96) 0%, transparent 44%),
            radial-gradient(ellipse at 96% 82%, rgba(24, 132, 78, 0.9) 0%, transparent 43%),
            linear-gradient(112deg, #063F43 0%, #07575B 53%, #08704F 100%);
        }

        .home-faq-content {
          width: min(90%, 1440px);
          max-width: 1440px;
          margin-inline: auto;
        }

        .home-faq .home-faq-heading,
        .home-faq .home-faq-heading span {
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }

        .home-faq-title-mark {
          width: 154px;
          height: 7px;
          border-radius: 999px;
          background: linear-gradient(90deg, #FFD45A, #A8DB69);
          clip-path: polygon(0 42%, 26% 0, 68% 8%, 100% 62%, 70% 48%, 28% 35%, 0 100%);
        }

        .home-faq-art {
          width: min(100%, 470px);
          filter: drop-shadow(0 14px 18px rgba(0, 25, 20, 0.2));
        }

        .home-faq-list {
          gap: 10px;
        }

        .home-faq-item {
          border-radius: 18px;
          box-shadow: 0 4px 14px rgba(0, 28, 24, 0.09);
          transition: border-color 260ms ease, background-color 260ms ease,
            box-shadow 260ms ease, transform 260ms ease;
        }

        .home-faq-item:hover {
          border-color: rgba(255, 212, 90, 0.95);
          box-shadow: 0 10px 24px rgba(0, 25, 20, 0.16);
          transform: translateY(-2px);
        }

        .home-faq-question {
          min-height: 58px;
          padding: 12px 18px;
          gap: 12px;
        }

        .home-faq-answer {
          padding: 0 18px 16px;
        }

        @media (max-width: 1023px) {
          .home-faq-content {
            width: min(100%, 760px);
          }

          .home-faq-art {
            width: min(100%, 390px);
          }
        }

        @media (max-width: 639px) {
          /* FAQ mobile layout: compact, stacked composition from the reference. */
          .home-faq {
            padding: 16px 16px 20px;
          }

          .home-faq-content {
            width: 100%;
            gap: 10px;
          }

          .home-faq-badge {
            gap: 6px;
            padding: 4px 9px;
            font-size: 9px;
          }

          .home-faq-badge > span {
            width: 14px;
            height: 14px;
            font-size: 9px;
          }

          .home-faq .home-faq-heading {
            max-width: 100%;
            margin-top: 7px;
            font-size: clamp(25px, 7.4vw, 30px);
            line-height: 0.98;
            letter-spacing: -0.045em;
          }

          .home-faq-title-mark {
            width: 82px;
            height: 4px;
            margin-top: 6px;
          }

          .home-faq-description {
            max-width: 100%;
            margin-top: 8px;
            font-size: 11.5px;
            line-height: 1.35;
          }

          .home-faq .home-faq-art {
            display: block;
            width: min(100%, 270px);
            max-width: 90%;
            height: auto;
            margin-top: 4px;
          }

          .home-faq-list {
            gap: 5px;
          }

          .home-faq-item {
            border-radius: 11px;
          }

          .home-faq-question {
            min-height: 29px;
            gap: 8px;
            padding: 4px 9px;
            font-size: 10.5px;
            line-height: 1.25;
          }

          .home-faq-question > span:last-child {
            width: 21px;
            height: 21px;
          }

          .home-faq-question > span:last-child svg {
            width: 12px;
            height: 12px;
          }

          .home-faq-answer {
            padding: 0 9px 10px;
            font-size: 11px;
            line-height: 1.45;
          }
        }



        /* Keep review circles evenly sized and show four complete cards on desktop. */
        .home-review-track {
          --home-review-gap: 12px;
          gap: var(--home-review-gap);
          overscroll-behavior-x: contain;
        }

        .home-review-card {
          box-sizing: border-box;
          flex: 0 0 154px;
          width: 154px;
          min-width: 154px;
          max-width: 154px;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          padding: 12px;
        }

        .home-review-card .home-review-author {
          max-width: 88%;
          overflow-wrap: anywhere;
        }

        .home-review-card .home-review-comment {
          width: 100%;
          min-width: 0;
          padding-inline: 7px;
          overflow-wrap: anywhere;
          word-break: normal;
        }

        @media (min-width: 640px) {
          .home-review-card {
            flex-basis: 174px;
            width: 174px;
            min-width: 174px;
            max-width: 174px;
            padding: 14px;
          }
        }

        @media (min-width: 1024px) {
          .home-review-card {
            flex: 0 0 min(146px, calc((100% - 36px) / 4));
            width: min(146px, calc((100% - 36px) / 4));
            min-width: min(146px, calc((100% - 36px) / 4));
            max-width: min(146px, calc((100% - 36px) / 4));
            padding: 13px;
          }
        }


        /* Mobile layout for Discover Kaduna, featured destinations and guest reviews. */
        @media (max-width: 639px) {
          .home-discover {
            padding: 14px 12px 22px;
            background: #FFF1BD;
          }

          .home-discover > .home-content {
            gap: 16px;
          }

          .home-discover > .home-content > div:first-child {
            padding-top: 0;
          }

          .home-discover > .home-content > div:first-child > .home-reveal {
            width: 100%;
          }

          .home-discover-eyebrow {
            gap: 6px;
            padding: 6px 11px;
            font-size: 10px;
          }

          .home-discover > .home-content > div:first-child h2 {
            display: flex;
            flex-wrap: nowrap;
            align-items: baseline;
            gap: 0.2em;
            margin-top: 13px;
            white-space: nowrap;
            font-size: clamp(1.95rem, 9.4vw, 2.8rem);
            line-height: 1;
            letter-spacing: -0.065em;
            color: #123B79;
          }

          .home-discover > .home-content > div:first-child h2 > span {
            display: inline;
          }

          .home-discover-scribble {
            display: block;
            width: 82%;
            max-width: 310px;
            height: auto;
            margin-top: 0;
            margin-left: 9%;
          }

          .home-discover > .home-content > div:first-child p {
            margin-top: 7px;
            font-size: 13px;
            line-height: 1.45;
          }

          .home-discover > .home-content > div:first-child .home-discover-cta-row {
            margin-top: 14px;
            gap: 8px;
          }

          .home-discover-cta-row > button {
            gap: 6px;
            padding: 9px 11px;
            font-size: 10px;
          }

          .home-discover-cta-row > button svg {
            width: 14px;
            height: 14px;
          }

          .home-discover > .home-content > div:first-child .home-discover-preview {
            margin-top: 12px;
            gap: 9px;
          }

          .home-discover-preview > div > span {
            width: 34px;
            height: 34px;
          }

          .home-discover-preview p {
            font-size: 10px;
            line-height: 1.35;
          }

          .home-discover-preview strong {
            font-size: 12px;
          }

          .home-discover-heading {
            margin-bottom: 9px;
            gap: 7px;
          }

          .home-discover-mountain {
            width: 34px;
            height: 25px;
          }

          .home-discover-heading {
            gap: 6px;
          }

          .home-discover-heading > div {
            flex: 1 1 auto;
            min-width: 0;
            gap: 6px;
          }

          .home-discover-heading h3 {
            font-size: 13px;
            line-height: 1.1;
            letter-spacing: -0.04em;
          }

          /* Keep View All fully visible; do not apply the old 32px arrow-button sizing. */
          .home-discover-heading .home-view-all-button {
            display: inline-flex;
            width: auto !important;
            min-width: 82px;
            max-width: none;
            height: 32px;
            min-height: 32px;
            flex: 0 0 auto;
            gap: 6px;
            padding: 3px 4px 3px 10px;
            font-size: 10px;
            line-height: 1;
            white-space: nowrap;
          }

          .home-discover-heading .home-view-all-button > span:last-child {
            display: inline-flex;
            width: 24px;
            height: 24px;
            min-width: 24px;
            flex: 0 0 24px;
            align-items: center;
            justify-content: center;
          }

          .home-discover-heading .home-view-all-button svg {
            width: 14px;
            height: 14px;
          }

          .home-destination-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .home-destination-grid > .home-reveal {
            min-width: 0;
          }

          .home-destination-card {
            height: auto !important;
            min-height: 0;
            aspect-ratio: 0.84 / 1;
            border-radius: 17px;
          }

          .home-destination-card > a:last-child > div {
            padding: 10px;
          }

          .home-destination-card h4 {
            display: -webkit-box;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            font-size: 13px !important;
            line-height: 1.08;
          }

          .home-destination-card p {
            display: none;
          }

          .home-destination-card h4 {
            font-size: 15px !important;
            line-height: 1.12;
          }

          .home-destination-card > a:last-child > span {
            width: 29px;
            height: 29px;
            margin: 0 9px 9px 0;
          }

          .home-destination-card > a:last-child > span svg {
            width: 15px;
            height: 15px;
          }

          .home-destination-card > span:first-of-type {
            top: 9px;
            left: 9px;
            padding: 5px 9px;
            font-size: 8px;
          }

          .home-discover-reviews-layout {
            grid-template-columns: 30px minmax(0, 1fr) 30px;
            column-gap: 6px;
            row-gap: 7px;
          }

          .home-discover-review-summary {
            grid-column: 1 / -1;
            align-items: center;
          }

          .home-discover-review-summary h3 {
            font-size: 15px;
          }

          .home-discover-review-summary p {
            font-size: 10px;
          }

          .home-discover-review-summary > div > div {
            margin-top: 3px;
          }

          .home-discover-review-summary > div > div svg {
            width: 12px;
            height: 12px;
          }

          .home-discover-review-summary > button {
            padding: 9px 12px;
            font-size: 10px;
          }

          .home-discover-review-summary > button svg {
            width: 13px;
            height: 13px;
          }

          .home-discover-review-track-wrap {
            grid-column: 2;
            grid-row: 2;
            min-width: 0;
            width: 100%;
          }

          .home-discover-review-track-wrap.no-review-arrows {
            grid-column: 1 / -1;
          }

          .home-review-track {
            --home-review-gap: 6px;
            gap: var(--home-review-gap);
            width: 100%;
            padding: 3px 0 !important;
          }

          .home-review-card {
            flex: 0 0 calc((100% - 12px) / 3);
            width: calc((100% - 12px) / 3);
            min-width: calc((100% - 12px) / 3);
            max-width: calc((100% - 12px) / 3);
            aspect-ratio: 0.92 / 1;
            padding: 7px 5px;
            border: 1px solid #F1E8CF !important;
            border-radius: 28px;
            background: #FFFEF8 !important;
            box-shadow: 0 5px 13px rgba(77, 62, 20, 0.1);
          }

          .home-review-card .home-review-author {
            max-width: 100%;
            font-size: 8px;
          }

          .home-review-card .home-review-comment {
            padding-inline: 1px;
            font-size: 7px;
            line-height: 1.25;
          }

          .home-review-card > div:first-child {
            width: 27px;
            height: 27px;
            margin-bottom: 4px;
          }

          .home-review-card > div:nth-of-type(2) svg {
            width: 8px;
            height: 8px;
          }

          .home-discover-reviews-layout > div:nth-child(3) {
            display: contents;
          }

          .home-discover-reviews-layout > div:nth-child(3) button:first-child {
            grid-column: 1;
            grid-row: 2;
            align-self: center;
            justify-self: center;
          }

          .home-discover-reviews-layout > div:nth-child(3) button:last-child {
            grid-column: 3;
            grid-row: 2;
            align-self: center;
            justify-self: center;
          }

          .home-discover-reviews-layout > div:nth-child(3) button {
            width: 30px;
            height: 30px;
          }

          .home-discover-reviews-layout > div:nth-child(3) button svg {
            width: 14px;
            height: 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {

          #home .home-reveal,
          html.home-reveal-ready #home .home-reveal:not(.is-visible) {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }

          .home-hero > img,

          .home-category-card-underline,

          .home-category-image,

          .home-hero-script-underline {

            animation: none !important;

            transition: none !important;

            transform: none !important;

          }

          .home-hero-shortcut {
            transition: none !important;
          }



          .home-about-photo {

            transition: none !important;

          }

          .home-review-track {

            scroll-behavior: auto;

          }

        }

      `}</style>

      <Header />

      {/* HERO SECTION */}

      <section className="home-hero relative isolate flex min-h-[calc(100svh-90px)] flex-col overflow-hidden">
        <Image
          src="/assets/images/kaduna-hero.png"
          alt="Kaduna landscape"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 z-0 h-full w-full object-cover object-center"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(3,20,14,0.22)_0%,rgba(3,20,14,0.10)_34%,rgba(3,20,14,0)_68%)]"
        />

        <div className="home-content home-hero-content relative z-[2] flex w-full flex-1 items-center max-md:!items-start px-5 sm:px-8 lg:px-0">
          <div className="home-hero-copy w-full">
            <div className="relative mb-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-[#092B20]/25 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white backdrop-blur-[2px] sm:mb-6 sm:text-sm">
              <MapPin size={18} className="fill-[#FFC928] text-[#FFC928]" />
              <span>Discover Kaduna</span>
            </div>

            <h1 className="max-w-[850px] text-[clamp(2.75rem,5.7vw,5.25rem)] font-black leading-[0.98] tracking-[-0.065em] text-white">
              <span className="block">Find your next</span>
              <span className="home-hero-script">unforgettable</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 430 22"
                className="home-hero-scribble"
                fill="none"
              >
                <path
                  d="M4 15C88 1 166 3 235 9C302 15 365 15 425 5"
                  stroke="#FFC928"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M92 19C175 10 261 11 345 15"
                  stroke="#FFC928"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </svg>
              <span className="home-hero-final-line">
                experience in
                <span className="home-hero-croc-script">
                  croc city!!
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 260 16"
                    className="home-hero-croc-scribble"
                    fill="none"
                  >
                    <path
                      d="M3 11C57 1 106 3 151 8C190 12 222 10 257 3"
                      stroke="#FFC928"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </span>
            </h1>

            <p className="mt-3 max-w-[540px] border-l-[4px] border-[#FFC928] pl-4 text-sm font-semibold leading-6 text-white sm:mt-6 sm:text-base sm:leading-7">
              Begin your journey now. Discover destinations, events, food,
              hotels and travel experiences across Kaduna.
            </p>

            <button
              type="button"
              onClick={() => navigateTo("/explore")}
              className="home-hero-cta mt-5 inline-flex items-center justify-between text-sm font-extrabold sm:text-base"
            >
              <span className="inline-flex min-w-0 items-center gap-3 sm:gap-5">
                <span className="home-hero-cta-icon">
                  <Search size={23} strokeWidth={2.5} />
                </span>
                <span>Explore Kaduna</span>
              </span>
              <ArrowRight size={19} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="home-hero-shortcuts">
          <div className="home-content grid grid-cols-3 items-stretch gap-2 px-5 sm:flex sm:flex-wrap sm:gap-2 sm:px-8 lg:px-0">
            {[
              { label: "Top destinations", icon: MapPin, filter: "attraction" },
              { label: "Events", icon: CalendarDays, href: "/events" },
              {
                label: "Natural beauty",
                icon: Mountain,
                filter: "natural-beauty",
              },
              {
                label: "Cultural experiences",
                icon: Landmark,
                filter: "cultural-experiences",
              },
            ].map(({ label, icon: Icon, filter, href }) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  href ? navigateTo(href) : selectCategory(filter)
                }
                className="home-hero-shortcut flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 text-center text-[10px] font-bold sm:min-w-[104px] sm:flex-none sm:text-xs"
              >
                <Icon size={25} strokeWidth={2.1} className="text-[#FFC928]" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* START EXPLORING */}

      <section
        id="categories"
        className="home-categories relative isolate overflow-hidden px-4 py-6 sm:px-7 sm:py-7 lg:px-0 lg:py-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 home-categories-glow"
        />

        <div className="home-content relative z-10 grid gap-6 lg:grid-cols-[minmax(280px,0.82fr)_minmax(0,2fr)] lg:items-center lg:gap-8 xl:gap-10">
          <div className="relative flex min-w-0 flex-col justify-start lg:min-h-[520px] lg:pt-14 lg:pb-0">
            <Reveal>
              <p className="home-category-eyebrow relative inline-block text-[11px] font-black uppercase tracking-[0.2em] text-[#103C2A] sm:text-xs">
                Start exploring
                <svg
                  aria-hidden="true"
                  viewBox="0 0 170 13"
                  className="absolute -bottom-3 left-0 h-3 w-36 sm:w-40"
                  fill="none"
                >
                  <path
                    d="M3 8C39 2 82 2 122 6C139 8 151 8 166 5"
                    stroke="#17613D"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </p>

              <div className="relative max-w-[590px]">
                <h2 className="home-category-title mt-6 max-w-[480px] text-[clamp(2.45rem,4.25vw,3.8rem)] font-black leading-[0.96] tracking-[-0.065em] text-[#080B08]">
                  What are you looking for?
                </h2>
              </div>

              <svg
                aria-hidden="true"
                viewBox="0 0 360 34"
                className="home-category-scribble home-discover-scribble mt-1 h-auto w-[75%] max-w-[330px]"
                fill="none"
              >
                <path
                  d="M4 23C49 8 91 7 118 13C143 19 85 28 105 30C131 32 174 8 223 11C260 12 283 20 354 14"
                  stroke="#17613D"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <p className="mt-3 max-w-md text-sm font-medium leading-6 text-[#17251B] sm:text-[15px] sm:leading-6">
                Choose a category to find places across Kaduna.
              </p>
            </Reveal>

            <svg
              aria-hidden="true"
              viewBox="0 0 620 150"
              fill="none"
              className="home-kaduna-line-art pointer-events-none absolute bottom-0 left-0 hidden w-full max-w-[540px] lg:block"
            >
              <path
                d="M8 125L75 83L112 91L168 45L207 82L258 69L300 112L348 102L391 120L452 111L510 125L610 128"
                stroke="#17613D"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M65 125L112 91L128 105L168 45L184 83L207 82M148 124L188 98L221 125M245 124L300 112L326 126M280 112L300 64L320 112M300 64L289 80L300 76L311 81"
                stroke="#17613D"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M350 124L358 78L420 78L430 124M358 78L370 60L407 60L420 78M370 60V46L407 46V60M385 78V94M402 78V94M378 108H411"
                stroke="#17613D"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M470 123C479 105 488 87 503 75C516 63 532 57 548 57C564 57 580 66 592 80M503 75C491 64 478 59 465 58M503 75C511 57 523 45 537 39M503 75C526 77 550 86 568 101M503 75C499 53 493 38 483 26"
                stroke="#17613D"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M12 137C128 132 236 137 343 134C443 131 532 136 610 132"
                stroke="#17613D"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => navigateTo("/explore")}
                className="inline-flex items-center gap-2 border-0 bg-transparent p-0 text-sm font-extrabold text-[#080B08] shadow-none transition duration-300 hover:translate-x-1 hover:bg-transparent hover:text-[#103C2A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#17613D]"
                style={{
                  background: "transparent",
                  backgroundColor: "transparent",
                  color: "#080B08",
                  border: "none",
                  boxShadow: "none",
                  padding: 0,
                }}
              >
                Explore all
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-5 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-5 xl:gap-x-6">
              {categoriesForDisplay.slice(0, 6).map((category, index) => (
                <Reveal
                  key={category._id || category.slug || category.name}
                  delay={index * 75}
                  className="h-full"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const categoryKey = String(
                        category.slug || category.name || "",
                      ).toLowerCase();

                      if (categoryKey.includes("event")) {
                        navigateTo("/events");
                        return;
                      }

                      selectCategory(category.slug || category.name);
                    }}
                    className="home-category-card group !m-0 flex h-full w-full flex-col appearance-none !rounded-none !border-0 !bg-transparent !p-0 !text-left !shadow-none"
                    style={{
                      background: "transparent",
                      backgroundColor: "transparent",
                      border: "none",
                      boxShadow: "none",
                      padding: 0,
                    }}
                  >
                    {category.image?.url && (
                      <div className="home-category-image relative aspect-[1.6/1] w-full overflow-hidden rounded-[17px] border-0 bg-transparent shadow-[0_5px_14px_rgba(64,48,0,0.12)] transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_13px_25px_rgba(64,48,0,0.2)] sm:rounded-[20px]">
                        <img
                          src={getCloudinaryImageUrl(category.image.url, 640)}
                          srcSet={getCloudinaryImageSrcSet(category.image.url)}
                          sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 260px"
                          alt={category.image.alt || category.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <h3 className="home-category-card-title mt-2.5 inline-flex w-fit max-w-full flex-col text-[13px] font-black leading-tight tracking-[-0.035em] text-[#080B08] sm:mt-3 sm:text-[15px] lg:text-base">
                      <span>{category.name}</span>

                      <span
                        aria-hidden="true"
                        className="home-category-card-underline mt-1 h-[3px] w-full origin-left rounded-full bg-[#17613D]"
                      />
                    </h3>

                    <p className="mt-1.5 w-full text-[11px] font-medium leading-[1.4] text-[#17251B] sm:text-[13px] sm:leading-[1.4]">
                      {category.description ||
                        "Discover places and experiences across Kaduna."}
                    </p>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DISCOVER KADUNA + FEATURED DESTINATIONS + REVIEWS */}

      <section
        id="destinations"
        className="home-discover bg-[#E7DBA1] px-4 py-5 sm:px-7 sm:py-6 lg:px-0 lg:py-7"
      >
        <div className="home-content grid items-start gap-5 lg:grid-cols-[minmax(270px,0.72fr)_minmax(0,1.78fr)] lg:gap-6 xl:gap-7">
          {/* LEFT INTRODUCTION */}

          <div className="flex min-w-0 flex-col self-start pt-1 lg:sticky lg:top-24 lg:h-fit">
            <Reveal>
              <div className="home-discover-eyebrow inline-flex w-fit items-center gap-2 rounded-full bg-[#D5E2C8] px-4 py-2 text-xs font-semibold text-[#16412D]">
                <MapPin size={15} fill="currentColor" />

                <span>
                  Discover the best of <strong>Kaduna</strong>
                </span>
              </div>

              <h2 className="mt-5 text-[clamp(3rem,4.7vw,4.8rem)] font-black leading-[0.88] tracking-[-0.065em] text-[#102D25]">
                Discover
                <span className="block">Kaduna</span>
              </h2>

              {/* HANDWRITTEN SVG SCRIBBLE UNDERLINE */}

              <svg
                viewBox="0 0 330 48"
                fill="none"
                aria-hidden="true"
                className="home-discover-scribble -mt-1 ml-[18%] h-auto w-[72%] max-w-[300px]"
              >
                <path
                  d="M5 30 C48 17 91 8 139 7 C170 6 191 7 211 10 C225 12 205 18 184 24 C163 30 151 34 143 39 C179 33 224 21 263 24 C287 25 309 30 325 35"
                  stroke="#17613D"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M102 40 C127 34 153 29 183 25 C212 21 243 23 272 29"
                  stroke="#17613D"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <p className="mt-3 max-w-[420px] text-sm leading-6 text-[#425D6B] sm:text-base sm:leading-7">
                Explore destinations and top experiences across Kaduna State.
              </p>

              <div className="home-discover-cta-row mt-6 flex flex-nowrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateTo("/explore")}
                  className="inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-full bg-[#075333] px-4 py-3 text-[11px] font-extrabold text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:bg-[#0B6841] hover:shadow-lg sm:px-5 sm:text-xs"
                >
                  Explore Destinations
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo("/events")}
                  className="inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-full border border-[#16412D] bg-transparent px-4 py-3 text-[11px] font-extrabold text-[#16412D] transition duration-300 hover:-translate-y-1 hover:bg-[#D5E2C8] sm:px-5 sm:text-xs"
                >
                  <span className="text-sm">▶</span>
                  Explore Events
                </button>
              </div>

              <div className="home-discover-preview mt-6 flex items-center gap-3">
                <div className="flex shrink-0 -space-x-3" aria-hidden="true">
                  {destinationPreviewImages.map((item, index) => (
                    <span
                      key={`${item.url}-${index}`}
                      className="h-10 w-10 overflow-hidden rounded-full border-[2px] border-[#F4E9C7] bg-[#D5E2C8] shadow-sm sm:h-12 sm:w-12"
                    >
                      <img
                        src={getCloudinaryImageUrl(item.url, 160)}
                        srcSet={getCloudinaryImageSrcSet(item.url)}
                        sizes="48px"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </span>
                  ))}
                </div>

                <p className="min-w-0 text-[11px] leading-[1.5] text-[#102D25]">
                  <strong className="block whitespace-nowrap font-extrabold">
                    10+ Amazing Destinations
                  </strong>
                  across Kaduna State
                </p>
              </div>
            </Reveal>
          </div>

          {/* RIGHT FEATURED DESTINATIONS AND REVIEWS */}

          <div className="min-w-0">
            <div className="home-discover-heading mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <svg
                  viewBox="0 0 58 42"
                  aria-hidden="true"
                  className="home-discover-mountain h-8 w-11 shrink-0"
                >
                  <path d="M2 38 19 9l17 29H2Z" fill="#2E8B57" />

                  <path d="m20 38 20-36 17 36H20Z" fill="#124C34" />

                  <path d="m19 9 7 12-7-3-7 7 7-16Z" fill="#D5E2C8" />

                  <path d="m40 2 7 14-8-4-7 7L40 2Z" fill="#E7DBA1" />
                </svg>

                <h3 className="truncate text-lg font-black tracking-[-0.035em] text-[#102D25] sm:text-xl">
                  Featured Destinations
                </h3>
              </div>

              <button
                type="button"
                onClick={() => navigateTo("/explore")}
                aria-label="View all destinations"
                className="home-view-all-button group inline-flex h-9 shrink-0 items-center gap-3 rounded-full border border-[#B6B88F] bg-transparent py-1 pl-4 pr-1.5 text-[11px] font-extrabold text-[#16412D] transition hover:border-[#075333] hover:bg-[#D5E2C8] sm:h-10 sm:pl-5 sm:text-xs"
              >
                <span>View All</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#075333] text-white transition group-hover:bg-[#0B6841] sm:h-8 sm:w-8">
                  <ArrowRight size={17} strokeWidth={2.5} />
                </span>
              </button>
            </div>

            {destinationsLoading &&
            !destinations.length ? null : destinationsError ? (
              <div
                role="alert"
                className="rounded-[26px] bg-[#F4EBCB] p-7 text-center"
              >
                <p className="text-sm font-bold text-red-800">loading...</p>

                <button
                  type="button"
                  onClick={loadDestinations}
                  className="mt-4 rounded-full bg-[#103C2A] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#17613D]"
                >
                  Try again
                </button>
              </div>
            ) : destinations.length ? (
              <div className="home-destination-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:h-[min(28vw,390px)] lg:grid-cols-2 lg:grid-rows-3 lg:gap-2.5">
                {destinations.slice(0, 4).map((destination, index) => {
                  const image = getDestinationImageUrl(destination);

                  const description =
                    destination.shortDescription ||
                    destination.description ||
                    destination.categoryLabel ||
                    "Discover this amazing destination in Kaduna State.";

                  const isMain = index === 0;
                  const destinationIdentifier =
                    destination.slug || destination._id || destination.id;
                  const destinationHref = destinationIdentifier
                    ? `/explore/${encodeURIComponent(String(destinationIdentifier))}`
                    : "/explore";

                  return (
                    <Reveal
                      key={
                        destination._id ||
                        destination.id ||
                        destination.slug ||
                        destination.name
                      }
                      delay={index * 75}
                      className={isMain ? "lg:row-span-3" : ""}
                    >
                      <article
                        className={`home-destination-card group relative h-[185px] w-full overflow-hidden rounded-[22px] bg-[#174B35] text-left shadow-[0_10px_24px_rgba(16,45,37,0.12)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(16,45,37,0.2)] lg:h-full ${
                          isMain
                            ? "sm:col-span-2 lg:col-span-1"
                            : "lg:col-span-1"
                        }`}
                      >
                        <Link
                          href={destinationHref}
                          aria-label={`Explore ${destination.name || "destination"}`}
                          className="absolute inset-0 z-0 block"
                        >
                          {image ? (
                            <img
                              src={getCloudinaryImageUrl(image, 900)}
                              srcSet={getCloudinaryImageSrcSet(image)}
                              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 450px"
                              alt={
                                destination.name ||
                                "Featured Kaduna destination"
                              }
                              loading={index === 0 ? "eager" : "lazy"}
                              decoding="async"
                              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#4D8061] to-[#123D2C]">
                              <Mountain size={38} className="text-white/70" />
                            </div>
                          )}

                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-[#06291D]/95 via-[#06291D]/15 to-transparent"
                          />
                        </Link>

                        {isMain && (
                          <span className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-[#F7EBC5] px-3.5 py-1.5 text-[10px] font-extrabold text-[#173D2B] shadow-sm">
                            Featured{" "}
                            <span className="ml-1 text-[#D79B12]">★</span>
                          </span>
                        )}

                        {destination._id || destination.id ? (
                          <div className="absolute right-3 top-3 z-20">
                            <DestinationFavorite
                              destination={destination}
                              variant="compact"
                            />
                          </div>
                        ) : null}

                        <Link
                          href={destinationHref}
                          tabIndex={-1}
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3"
                        >
                          <div
                            className={`min-w-0 ${
                              isMain ? "p-4 sm:p-6" : "p-3.5 sm:p-4"
                            }`}
                          >
                            <h4
                              className={`${
                                isMain
                                  ? "text-xl sm:text-2xl"
                                  : "text-sm sm:text-base"
                              } font-black leading-tight tracking-tight text-white`}
                            >
                              {destination.name}
                            </h4>

                            <p
                              className={`mt-1 max-w-[95%] text-white/95 ${
                                isMain
                                  ? "text-xs leading-5 sm:text-sm"
                                  : "text-[10px] leading-[1.4] sm:text-xs"
                              } line-clamp-2`}
                            >
                              {description}
                            </p>
                          </div>

                          <span
                            className={`mb-4 mr-4 flex shrink-0 items-center justify-center rounded-full border border-white/90 text-white transition duration-300 group-hover:bg-white group-hover:text-[#103C2A] ${
                              isMain ? "h-10 w-10" : "h-8 w-8"
                            }`}
                          >
                            <ArrowRight size={isMain ? 18 : 15} />
                          </span>
                        </Link>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[270px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#B6B88F] bg-[#F4EBCB]/70 px-5 py-8 text-center">
                <Compass size={30} className="text-[#17613D]" />

                <p className="mt-3 text-sm font-bold text-[#103C2A]">
                  No destinations are available yet.
                </p>

                <p className="mt-2 max-w-md text-xs leading-5 text-[#526B8A]">
                  Choose featured destinations in the destination admin to
                  display them here.
                </p>
              </div>
            )}

            {/* COMPACT REVIEWS DIRECTLY UNDER THE DESTINATION IMAGES */}

            <div className="mt-2.5 border-t border-[#F5EBCB]/90 pt-2.5">
              <div className="home-discover-reviews-layout grid items-center gap-3 xl:grid-cols-[108px_minmax(0,1fr)_auto]">
                <div className="home-discover-review-summary flex items-center justify-between gap-2 xl:block">
                  <div>
                    <h3 className="text-sm font-black leading-tight tracking-tight text-[#10442F] sm:text-base">
                      5.0 Guest Reviews
                    </h3>

                    <p className="mt-1 text-[9px] font-semibold text-[#526B8A]">
                      {reviewStats.totalReviews || reviews.length} reviews
                    </p>

                    <div
                      className="mt-1.5 flex items-center gap-0.5 text-[#FFB900]"
                      aria-label="5 out of 5 stars"
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={13} fill="currentColor" />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateTo("/explore")}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF0D0] px-3 py-2 text-[9px] font-extrabold text-[#65450D] transition duration-300 hover:-translate-y-0.5 hover:bg-[#FFBD4A] xl:mt-2"
                  >
                    Leave a review
                    <ArrowRight size={11} />
                  </button>
                </div>

                <div
                  className={`home-discover-review-track-wrap min-w-0 ${
                    reviews.length > 4
                      ? "has-review-arrows"
                      : "no-review-arrows"
                  }`}
                >
                  {reviews.length ? (
                    <div
                      ref={reviewTrackRef}
                      className="home-review-track flex snap-x snap-mandatory items-center overflow-x-hidden px-1 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-behavior:smooth]"
                      aria-label="Visitor reviews. Use the arrows to see more reviews."
                    >
                      {reviews.map((review) => {
                        const author = getReviewAuthor(review);

                        return (
                          <article
                            key={
                              review._id || `${author.name}-${review.review}`
                            }
                            className="home-review-card flex shrink-0 snap-start snap-always flex-col items-center justify-center rounded-full border-2 border-[#A9D4FF] !bg-[#EBF4FF] text-center shadow-[0_5px_14px_rgba(37,99,235,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_9px_20px_rgba(37,99,235,0.14)]"
                          >
                            <div className="mb-1.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#D9E9FA] shadow-sm sm:h-9 sm:w-9">
                              {author.photo ? (
                                <img
                                  src={getCloudinaryImageUrl(author.photo, 160)}
                                  srcSet={getCloudinaryImageSrcSet(
                                    author.photo,
                                  )}
                                  sizes="36px"
                                  alt={author.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-black text-[#17613D]">
                                  {author.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <p className="home-review-author w-full truncate text-[9px] font-extrabold leading-tight text-[#102D25] sm:text-[10px]">
                              {author.name}
                            </p>

                            <div
                              className="mt-1 flex justify-center gap-0.5 text-[#FFB900]"
                              aria-label={`${review.rating || 0} out of 5 stars`}
                            >
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  size={10}
                                  fill={
                                    i < Number(review.rating || 0)
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              ))}
                            </div>

                            <p className="home-review-comment mt-1.5 line-clamp-3 text-[8px] leading-[1.3] text-[#354B40] [text-wrap:pretty]">
                              “{review.review}”
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  ) : reviewsLoading ? null : (
                    <p className="px-2 py-3 text-[10px] leading-5 text-[#526B8A]">
                      No visitor reviews have been published yet.
                    </p>
                  )}
                </div>

                {reviews.length > 4 && (
                  <div className="flex shrink-0 items-center justify-end gap-1.5 xl:flex-col">
                    <button
                      type="button"
                      onClick={() => scrollReviews(-1)}
                      aria-label="Previous review"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#C5BD83] text-[#16412D] transition hover:bg-[#D5E2C8]"
                    >
                      <ArrowLeft size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollReviews(1)}
                      aria-label="Next review"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#075333] text-white transition hover:bg-[#0B6841]"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT KADUNA EXPLORER */}
      <section
        id="about"
        className="home-about relative isolate overflow-hidden bg-[#FFFCF4] px-4 pb-6 pt-6 sm:px-7 sm:pb-7 sm:pt-7 lg:px-0 lg:pb-5 lg:pt-6"
      >
        <div className="home-content relative">
          <div className="grid items-center gap-7 sm:gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-7 xl:gap-9">
            <Reveal className="relative z-10 min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DDE8B8] bg-[#F1F6DF] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[-0.02em] text-[#123B27] shadow-sm sm:px-4 sm:py-2 sm:text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#07552F] text-white">
                  <Compass size={14} />
                </span>
                About Kaduna Explorer
              </div>

              <h2 className="mt-4 max-w-[720px] text-[clamp(2.25rem,4.1vw,3.45rem)] font-black leading-[0.98] tracking-[-0.065em] text-[#071D17]">
                Discover Kaduna.
                <span className="relative mt-1 block w-fit italic text-[#16833C]">
                  Experience more.
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 360 20"
                    className="absolute -bottom-3 left-[38%] h-4 w-[62%]"
                    fill="none"
                  >
                    <path
                      d="M4 13C91 1 231 1 350 12"
                      stroke="#F5B400"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h2>

              <p className="mt-6 max-w-[720px] text-[14px] font-medium leading-[1.55] text-[#172A22] sm:text-[15px] sm:leading-[1.6]">
                {currentAbout.description ||
                  "Kaduna Explorer is your digital travel companion for discovering the beauty, culture, history and everyday experiences across Kaduna State. Find top destinations, local events, places to stay, and hidden gems, all in one simple and reliable platform."}
              </p>

              <div
                className="home-about-flight relative mt-5 hidden h-[38px] w-full lg:block"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 760 72"
                  className="absolute inset-0 h-full w-full overflow-visible"
                  fill="none"
                >
                  <path
                    d="M-20 5C15 5 10 58 70 61C160 70 218 25 315 31C395 36 420 67 500 59C584 51 624 10 780 23"
                    stroke="#12452D"
                    strokeWidth="2.3"
                    strokeDasharray="7 6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 7C-2 16 -8 28 -8 36C-8 47 0 55 10 55C20 55 28 47 28 36C28 26 16 11 10 3Z"
                    fill="#F5B400"
                    transform="translate(0 0) scale(.82)"
                  />
                  <circle cx="8" cy="34" r="5" fill="#FFFCF4" />
                  <g transform="translate(610 4) rotate(4)">
                    <path
                      d="M2 25L25 20L15 3L20 1L38 17L62 12L68 16L43 27L36 47L31 48L31 30L8 34Z"
                      fill="#07552F"
                    />
                  </g>
                </svg>
              </div>

              <div className="home-about-feature-grid mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:mt-1 lg:gap-2.5">
                {[
                  {
                    icon: "pin",
                    title: "Discover Places",
                    description:
                      "Explore top attractions, nature, heritage sites and local experiences across Kaduna.",
                  },
                  {
                    icon: "calendar",
                    title: "Find Events",
                    description:
                      "Stay updated on cultural, social and tourism events happening near you.",
                  },
                  {
                    icon: "stay",
                    title: "Plan Your Trip",
                    description:
                      "Get recommendations for accommodation, food, and activities that fit your travel style.",
                  },
                ].map((item, index) => (
                  <article
                    key={item.title}
                    className="home-about-feature rounded-[20px] border border-[#E9E8D3] bg-white/35 px-3 pb-3 pt-3 shadow-[0_2px_8px_rgba(28,66,42,0.025)] transition duration-300 hover:-translate-y-1 hover:border-[#C8DDAA] hover:shadow-[0_12px_26px_rgba(28,66,42,0.08)] sm:px-3 sm:pt-3 lg:min-h-[155px] xl:px-3"
                  >
                    <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#6CCB18] text-white shadow-sm sm:h-11 sm:w-11">
                      {item.icon === "pin" ? (
                        <MapPin size={27} fill="white" strokeWidth={2.5} />
                      ) : item.icon === "calendar" ? (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <path d="M16 3v4M8 3v4M3 10h18M8 14h2v2H8zM14 14h2v2h-2z" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 10.5 12 4l9 6.5V21H3z" />
                          <path d="M8 21v-7h8v7M2 10.5 12 3l10 7.5" />
                        </svg>
                      )}
                    </span>
                    <h3 className="text-[15px] font-black leading-tight tracking-[-0.04em] text-[#071D17] sm:text-[14px] xl:text-[15px]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[12px] font-medium leading-[1.35] text-[#172A22] sm:text-[11px] xl:text-[12px]">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <button
                  type="button"
                  onClick={() => navigateTo("/explore")}
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#006329] px-6 py-3 text-[13px] font-extrabold text-white shadow-[0_8px_18px_rgba(0,76,36,0.15)] transition duration-300 hover:-translate-y-1 hover:bg-[#08783A] hover:shadow-lg"
                >
                  Search More Destination <ArrowRight size={19} />
                </button>
              </div>
            </Reveal>

            <Reveal delay={120} className="relative min-w-0">
              <div className="home-about-gallery relative mx-auto h-[250px] w-full max-w-[500px] sm:h-[310px] md:h-[330px] lg:h-[260px] lg:max-w-[390px] xl:h-[320px] xl:max-w-[410px]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 620 420"
                  className="pointer-events-none absolute -top-[25%] left-[-23%] z-20 h-[92%] w-[110%] overflow-visible"
                  fill="none"
                >
                  <path
                    d="M76 250C-5 112 125 7 292 10C390 12 458 44 520 89C448 40 355 30 273 43C142 64 67 148 76 250Z"
                    fill="#B8E36A"
                    opacity=".55"
                  />
                </svg>

                <div
                  ref={aboutGalleryRef}
                  className="home-about-collage relative z-10 h-full w-full"
                >
                  {aboutGallery.length > 0 && (
                    <div
                      className="home-about-cylinder"
                      style={{
                        transform: `rotateY(${-activeAboutImage * aboutCylinderStep}deg)`,
                      }}
                    >
                      {aboutGallery.map((image, imageIndex) => {
                        const faceCopies = aboutGallery.length < 5 ? 2 : 1;

                        return Array.from(
                          { length: faceCopies },
                          (_, copyIndex) => {
                            const faceIndex =
                              imageIndex + copyIndex * aboutGallery.length;
                            const angle = faceIndex * aboutCylinderStep;
                            const isFront =
                              imageIndex === activeAboutImage &&
                              copyIndex === 0;

                            return (
                              <article
                                key={`${image.publicId || image.url}-${copyIndex}`}
                                className={`home-about-photo ${isFront ? "home-about-photo-center" : ""}`}
                                style={{
                                  transform: `rotateY(${angle}deg) translateZ(${aboutCylinderRadius}px)`,
                                }}
                                aria-hidden={!isFront}
                              >
                                <img
                                  src={getCloudinaryImageUrl(image.url, 900)}
                                  srcSet={getCloudinaryImageSrcSet(image.url)}
                                  sizes="(max-width: 639px) 124px, (max-width: 1023px) 220px, 320px"
                                  alt={
                                    image.name ||
                                    image.alt ||
                                    `Kaduna story ${imageIndex + 1}`
                                  }
                                  loading={
                                    Math.abs(imageIndex - activeAboutImage) <= 1
                                      ? "eager"
                                      : "lazy"
                                  }
                                  decoding="async"
                                  draggable="false"
                                />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/65 via-black/15 to-transparent px-2 pb-3 pt-12 sm:px-3 sm:pb-4">
                                  <span className="mx-auto flex w-fit max-w-full items-center justify-center gap-1.5 rounded-full bg-[#006329] px-3 py-2 text-center text-[9px] font-extrabold leading-tight text-white shadow-md sm:px-4 sm:text-sm">
                                    <MapPin
                                      size={13}
                                      fill="white"
                                      className="shrink-0"
                                    />
                                    <span className="truncate">
                                      {image.name ||
                                        image.alt ||
                                        `Kaduna Experience ${imageIndex + 1}`}
                                    </span>
                                  </span>
                                </div>
                              </article>
                            );
                          },
                        );
                      })}
                    </div>
                  )}
                </div>

                {aboutGallery.length > 1 && (
                  <div className="home-about-gallery-controls absolute bottom-[-19%] left-1/2 z-40 flex -translate-x-1/2 items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveAboutImage(
                          (activeAboutImage - 1 + aboutGallery.length) %
                            aboutGallery.length,
                        )
                      }
                      aria-label="Show previous gallery image"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D7E5C7] bg-white/90 text-[#07552F] shadow-sm transition hover:scale-110 hover:bg-white"
                    >
                      <ArrowLeft size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveAboutImage(
                          (activeAboutImage + 1) % aboutGallery.length,
                        )
                      }
                      aria-label="Show next gallery image"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D7E5C7] bg-white/90 text-[#07552F] shadow-sm transition hover:scale-110 hover:bg-white"
                    >
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            </Reveal>
          </div>

          <div
            className="home-about-signature relative mx-auto mt-1 flex w-full max-w-[1040px] items-center justify-center gap-3 pb-1 pt-2 text-center sm:mt-2 sm:gap-5"
            aria-label="Come Explore Kaduna"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 180 40"
              className="home-about-signature-flourish hidden h-7 min-w-0 flex-1 sm:block"
              fill="none"
            >
              <path
                d="M4 31C48 1 115 2 174 20"
                stroke="#07552F"
                strokeWidth="2.7"
                strokeLinecap="round"
              />
              <path
                d="M26 34C66 13 112 12 151 22"
                stroke="#A8C96B"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity=".8"
              />
            </svg>
            <div className="relative shrink-0 px-1 sm:px-3">
              <p className="home-about-signature-copy">Come Explore Kaduna</p>
              <svg
                aria-hidden="true"
                viewBox="0 0 420 30"
                className="mx-auto mt-1 h-4 w-[88%] sm:h-5"
                fill="none"
              >
                <path
                  d="M5 22C107 -1 300 -1 411 17"
                  stroke="#F5B400"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <svg
              aria-hidden="true"
              viewBox="0 0 180 40"
              className="home-about-signature-flourish hidden h-10 min-w-0 flex-1 sm:block"
              fill="none"
            >
              <path
                d="M4 19C63 -1 132 3 176 34"
                stroke="#07552F"
                strokeWidth="2.7"
                strokeLinecap="round"
              />
              <path
                d="M29 18C75 8 120 13 158 31"
                stroke="#A8C96B"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity=".8"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section
        id="faqs"
        className="home-faq relative isolate overflow-hidden px-4 py-9 sm:px-7 sm:py-11 lg:px-0 lg:py-12"
      >
        <div className="home-faq-content relative z-10 grid items-start gap-7 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:gap-8 xl:gap-10">
          <Reveal className="relative flex min-w-0 flex-col">
            <span className="home-faq-badge inline-flex w-fit items-center gap-2 rounded-full bg-[#FFD000] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#073D31] shadow-sm">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#07552F] text-[10px] font-black text-[#FFD000]">
                ?
              </span>
              FAQ
            </span>

            <h2 className="home-faq-heading mt-5 max-w-[500px] text-[clamp(2.25rem,3.35vw,3.45rem)] font-black leading-[1.02] tracking-[-0.055em] text-white [text-shadow:0_2px_18px_rgba(0,25,20,0.18)]">
              Frequently
              <span className="block">
                Asked <span>Questions</span>
              </span>
            </h2>

            <span aria-hidden="true" className="home-faq-title-mark mt-3" />

            <p className="home-faq-description mt-5 max-w-[410px] text-[15px] font-medium leading-[1.55] text-white/90 sm:text-base sm:leading-[1.6]">
              Find quick answers to common questions about Kaduna Explorer,
              destinations, bookings and more.
            </p>

            <svg
              aria-hidden="true"
              viewBox="0 0 520 300"
              className="home-faq-art mt-5 hidden h-auto self-center lg:block"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="faq-map-paper"
                  x1="245"
                  y1="115"
                  x2="410"
                  y2="275"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#F7FCF2" />
                  <stop offset="1" stopColor="#B8E2D0" />
                </linearGradient>
                <linearGradient
                  id="faq-sign-green"
                  x1="45"
                  y1="125"
                  x2="245"
                  y2="165"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#079B25" />
                  <stop offset="1" stopColor="#08752C" />
                </linearGradient>
                <linearGradient
                  id="faq-hill"
                  x1="260"
                  y1="175"
                  x2="370"
                  y2="250"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#A5C94B" />
                  <stop offset="1" stopColor="#17633D" />
                </linearGradient>
              </defs>
              <circle cx="347" cy="98" r="54" fill="#FFD23B" />
              <path
                d="M414 84c3-12 20-15 27-5 8-14 30-10 32 7 13 0 19 9 18 16h-77c-9-2-10-12 0-18Z"
                fill="#F7FFF9"
              />
              <path
                d="m225 143 66-28 72 26 72-21 20 151-77-20-73 24-76-23-68 17 64-126Z"
                fill="url(#faq-map-paper)"
                stroke="#E8FFF3"
                strokeWidth="7"
                strokeLinejoin="round"
              />
              <path
                d="m225 143-2 129m68-157 14 140m58-114 15 122m72-143 5 137"
                stroke="#74BDA0"
                strokeWidth="3"
                opacity=".8"
              />
              <path
                d="M239 244c27-24 38-48 60-58 18-8 30 2 46-12 12-11 21-21 39-19 13 2 23 12 38 6"
                stroke="#E7B92B"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="7 7"
              />
              <path
                d="M249 245c24-38 39-54 61-59l20 18 22-42 17 26 25-8 23 32-24 30-45 13-45-4-28 13-26-19Z"
                fill="url(#faq-hill)"
              />
              <path
                d="m285 232 22-32 14 14 16-34 15 25 17-13 25 34-28 18-43 4-38-16Z"
                fill="#2E8A51"
              />
              <path
                d="m307 200 14 14 16-34 15 25"
                stroke="#D5E9B0"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M371 148c-12 0-22 10-22 22 0 17 22 42 22 42s22-25 22-42c0-12-10-22-22-22Z"
                fill="#F7B900"
              />
              <circle cx="371" cy="170" r="7" fill="#FFF7D7" />
              <path
                d="M112 70h18v208h-18z"
                fill="#9B5726"
                stroke="#713B1B"
                strokeWidth="3"
              />
              <path
                d="m113 86 17 0m-17 56 17 0m-17 56 17 0"
                stroke="#C77A38"
                strokeWidth="3"
              />
              <path
                d="M130 42h126l16 17-16 17H130c-4 0-7-3-7-7V49c0-4 3-7 7-7Z"
                fill="url(#faq-sign-green)"
                stroke="#075A24"
                strokeWidth="3.5"
              />
              <path
                d="m146 49 3.8 7.5 8.2 1.2-6 5.8 1.4 8.1-7.4-3.9-7.4 3.9 1.4-8.1-6-5.8 8.2-1.2 3.8-7.5Z"
                fill="#FFD000"
              />
              <text x="166" y="66" fill="white" fontSize="18" fontWeight="800">
                Events
              </text>
              <path
                d="M40 83h171l21 22-21 22H40c-5 0-9-4-9-9V92c0-5 4-9 9-9Z"
                fill="url(#faq-sign-green)"
                stroke="#075A24"
                strokeWidth="4"
              />
              <path
                d="M58 92c-8 0-14 6-14 14 0 11 14 26 14 26s14-15 14-26c0-8-6-14-14-14Z"
                fill="#FFC400"
              />
              <circle cx="58" cy="106" r="4.5" fill="#08752C" />
              <text x="82" y="117" fill="white" fontSize="20" fontWeight="800">
                Destinations
              </text>
              <path
                d="M31 137h166l20 21-20 21H31c-5 0-9-4-9-9v-24c0-5 4-9 9-9Z"
                fill="url(#faq-sign-green)"
                stroke="#075A24"
                strokeWidth="4"
              />
              <rect
                x="43"
                y="148"
                width="22"
                height="22"
                rx="2"
                stroke="#FFD000"
                strokeWidth="3"
              />
              <path
                d="M43 155h22m-16-11v8m10-8v8m-10 7v4m7-4v4"
                stroke="#FFD000"
                strokeWidth="2.5"
              />
              <text x="78" y="168" fill="white" fontSize="20" fontWeight="800">
                Bookings
              </text>
              <path
                d="M52 191h168l20 21-20 21H52c-5 0-9-4-9-9v-24c0-5 4-9 9-9Z"
                fill="url(#faq-sign-green)"
                stroke="#075A24"
                strokeWidth="4"
              />
              <path
                d="m68 198 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2 5-10Z"
                fill="#FFD000"
              />
              <text x="93" y="222" fill="white" fontSize="20" fontWeight="800">
                Reviews
              </text>
              <path
                d="M39 245h183l20 21-20 21H39c-5 0-9-4-9-9v-24c0-5 4-9 9-9Z"
                fill="url(#faq-sign-green)"
                stroke="#075A24"
                strokeWidth="4"
              />
              <path
                d="m48 252 9-4 9 4 9-4v20l-9 4-9-4-9 4v-20Z"
                stroke="#FFD000"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path d="M57 248v20m9-16v20" stroke="#FFD000" strokeWidth="2" />
              <text x="85" y="276" fill="white" fontSize="20" fontWeight="800">
                Trip Plans
              </text>
              <path
                d="M15 294c30-18 53-19 79-5 27-20 51-17 73-4 25-13 44-12 65 1 24-12 47-9 67 3 28-17 52-16 79-1 22-11 44-8 64 4 20-9 37-8 55 2"
                stroke="#148348"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M23 263c-15-14-18-30-10-43 16 7 22 23 10 43Zm29 16c-18-6-27-18-25-33 18 1 29 14 25 33Zm381 4c-2-17 7-30 22-35 6 17-2 31-22 35Zm26 10c6-17 20-25 35-21-4 17-18 26-35 21Z"
                fill="#29964E"
              />
              <ellipse
                cx="258"
                cy="295"
                rx="245"
                ry="9"
                fill="#0B6A3A"
                opacity=".55"
              />
            </svg>
          </Reveal>

          <div className="home-faq-list min-w-0 flex flex-col">
            {faqs.length ? (
              faqs.map((faq, index) => (
                <Reveal
                  key={faq._id || `${faq.question}-${index}`}
                  delay={index * 45}
                >
                  <article
                    className={`home-faq-item overflow-hidden border ${
                      openFaq === index
                        ? "border-[#FFF2C8] bg-[#FFF7D9]"
                        : "border-white/80 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={openFaq === index}
                      onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                      className="home-faq-question flex w-full items-center justify-between text-left text-[14px] font-black leading-6 text-[#073D31] transition-colors duration-300 hover:text-[#08743D] sm:text-base lg:text-[16px]"
                    >
                      <span className="min-w-0">{faq.question}</span>
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                          openFaq === index
                            ? "bg-[#16852F] text-white"
                            : "bg-[#DDF0D5] text-[#07552F]"
                        }`}
                      >
                        {openFaq === index ? (
                          <Minus size={19} strokeWidth={3} />
                        ) : (
                          <Plus size={19} strokeWidth={2.7} />
                        )}
                      </span>
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ${
                        openFaq === index
                          ? "grid-rows-[1fr]"
                          : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="home-faq-answer text-[13px] font-medium leading-6 text-[#16463A] sm:text-[14px] sm:leading-[1.55] lg:text-[14px]">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))
            ) : (
              <div className="rounded-[22px] border border-white/70 bg-white px-6 py-8 text-sm leading-7 text-[#16463A]">
                Frequently asked questions will appear here as soon as they are
                published in Admin → Homepage → FAQs.
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
