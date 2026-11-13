"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

const RouteTransitionContext = createContext(null);

const LOADER_SHOW_DELAY = 250;
const LOADER_MINIMUM_VISIBLE = 350;
const NAVIGATION_TIMEOUT = 12000;

export function useRouteTransition() {
  const context = useContext(RouteTransitionContext);

  if (!context) {
    throw new Error(
      "useRouteTransition must be used inside RouteTransitionProvider",
    );
  }

  return context;
}

function RouteChangeTracker({ onRouteChange }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRouteRef = useRef(routeKey);

  useEffect(() => {
    if (previousRouteRef.current === routeKey) return;

    previousRouteRef.current = routeKey;
    onRouteChange();
  }, [routeKey, onRouteChange]);

  return null;
}

export default function RouteTransitionProvider({ children }) {
  const pendingRef = useRef(false);
  const loaderShownAtRef = useRef(0);
  const showTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const navigationTimeoutRef = useRef(null);

  const [isNavigating, setIsNavigating] = useState(false);

  const clearTimers = useCallback(() => {
    window.clearTimeout(showTimeoutRef.current);
    window.clearTimeout(hideTimeoutRef.current);
    window.clearTimeout(navigationTimeoutRef.current);
  }, []);

  const startNavigation = useCallback(
    (href) => {
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      const target = new URL(href, window.location.href);

      if (target.origin !== window.location.origin) return;

      const currentRoute = `${window.location.pathname}?${new URLSearchParams(
        window.location.search,
      ).toString()}`;
      const targetRoute = `${target.pathname}?${target.searchParams.toString()}`;

      if (targetRoute === currentRoute) return;

      clearTimers();
      pendingRef.current = true;
      loaderShownAtRef.current = 0;

      // Fast route changes complete without showing a spinner.
      showTimeoutRef.current = window.setTimeout(() => {
        if (!pendingRef.current) return;
        loaderShownAtRef.current = Date.now();
        setIsNavigating(true);
      }, LOADER_SHOW_DELAY);

      navigationTimeoutRef.current = window.setTimeout(() => {
        pendingRef.current = false;
        clearTimers();
        setIsNavigating(false);
      }, NAVIGATION_TIMEOUT);
    },
    [clearTimers],
  );

  const handleRouteChange = useCallback(() => {
    if (!pendingRef.current) return;

    pendingRef.current = false;
    window.clearTimeout(showTimeoutRef.current);
    window.clearTimeout(navigationTimeoutRef.current);

    // If navigation finished before the delay, no spinner was shown.
    if (!loaderShownAtRef.current) {
      setIsNavigating(false);
      return;
    }

    const elapsed = Date.now() - loaderShownAtRef.current;
    const remaining = Math.max(0, LOADER_MINIMUM_VISIBLE - elapsed);

    hideTimeoutRef.current = window.setTimeout(() => {
      setIsNavigating(false);
      loaderShownAtRef.current = 0;
    }, remaining);
  }, []);

  useEffect(() => {
    return () => {
      pendingRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  const value = useMemo(() => ({ startNavigation }), [startNavigation]);

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <RouteChangeTracker onRouteChange={handleRouteChange} />
      </Suspense>
      <div
        className={`ke-route-loader${isNavigating ? " is-visible" : ""}`}
        role="status"
        aria-live="polite"
        aria-label="Loading page"
        aria-hidden={!isNavigating}
      >
        <div className="ke-route-loader__content">
          <LoaderCircle
            className="ke-route-loader__icon"
            size={48}
            strokeWidth={2.2}
            aria-hidden="true"
          />
          <span className="ke-route-loader__label">Loading</span>
        </div>
      </div>
    </RouteTransitionContext.Provider>
  );
}
