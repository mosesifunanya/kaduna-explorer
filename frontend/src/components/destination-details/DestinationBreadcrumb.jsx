import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function DestinationBreadcrumb({ destinationName }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex flex-wrap items-center gap-2 text-sm text-[#707B82]"
    >
      <Link href="/" className="transition hover:text-[#24714C]">
        Home
      </Link>

      <ChevronRight size={14} />

      <Link href="/explore" className="transition hover:text-[#24714C]">
        Explore
      </Link>

      <ChevronRight size={14} />

      <span className="font-semibold text-[#192A35]">{destinationName}</span>
    </nav>
  );
}
