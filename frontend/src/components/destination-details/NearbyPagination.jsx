"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { PLACES_PER_PAGE } from "@/lib/destinationDetailsPageUtils";

export default function NearbyPagination({
  currentPage,
  totalItems,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PLACES_PER_PAGE));

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * PLACES_PER_PAGE + 1;
  const endItem = Math.min(currentPage * PLACES_PER_PAGE, totalItems);

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <nav
      aria-label="Nearby places pagination"
      className="mt-5 flex w-full flex-col gap-3 rounded-xl border border-[#EAE7DF] bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3"
    >
      {/* Results information */}
      <p
        aria-live="polite"
        className="text-center text-[11px] font-medium leading-5 text-[#778078] sm:text-left sm:text-xs"
      >
        Showing{" "}
        <span className="font-bold text-[#174B35]">
          {startItem}–{endItem}
        </span>{" "}
        of <span className="font-bold text-[#174B35]">{totalItems}</span> places
      </p>

      {/* Pagination controls */}
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange((page) => Math.max(1, page - 1))}
          disabled={isFirstPage}
          aria-label="Go to previous page"
          className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E5E9E4] bg-white px-3 py-2 text-[11px] font-bold text-[#174B35] transition-colors duration-200 hover:border-[#174B35] hover:bg-[#F2F6F1] disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-10 sm:flex-none sm:gap-2 sm:px-4 sm:text-xs"
        >
          <ChevronLeft size={15} />
          <span>Previous</span>
        </button>

        <span
          aria-current="page"
          className="flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#174B35] px-3 py-2 text-[10px] font-bold text-white sm:min-h-10 sm:px-4 sm:text-xs"
        >
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
          disabled={isLastPage}
          aria-label="Go to next page"
          className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E5E9E4] bg-white px-3 py-2 text-[11px] font-bold text-[#174B35] transition-colors duration-200 hover:border-[#174B35] hover:bg-[#F2F6F1] disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-10 sm:flex-none sm:gap-2 sm:px-4 sm:text-xs"
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
