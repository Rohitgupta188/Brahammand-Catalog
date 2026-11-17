import Link from "next/link";
import { AlertCircle, BookOpen } from "lucide-react";

interface AppHeaderProps {
  totalCatalogue: number;
  missingPhotoCount: number;
  activeRoute: "catalog" | "missing-photos";
}

export function AppHeader({
  totalCatalogue,
  missingPhotoCount,
  activeRoute,
}: AppHeaderProps) {
  return (
    <header className="border-b border-[#e5ded0] bg-[#f5f1e8]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.22em] text-[#8e6327] uppercase"
          >
            Brahammand Jewels
          </Link>
          <h1 className="font-serif text-2xl font-normal tracking-tight text-[#2a2722]">
            {activeRoute === "catalog"
              ? "Product Catalog Builder"
              : "Missing Catalog Photos"}
          </h1>
        </div>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
              activeRoute === "catalog"
                ? "bg-[#2a2722] text-[#f5f1e8]"
                : "border border-[#d8cfbe] bg-white text-[#2a2722] hover:border-[#8e6327]"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Catalog ({totalCatalogue.toLocaleString()})
          </Link>
          {/* <Link
            href="/missing-photos"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
              activeRoute === "missing-photos"
                ? "bg-[#2a2722] text-[#f5f1e8]"
                : "border border-[#d8cfbe] bg-white text-[#6e685f] hover:border-[#8e6327] hover:text-[#2a2722]"
            }`}
          >
            <AlertCircle className="h-4 w-4 text-[#8e6327]" />
            Missing Photos ({missingPhotoCount.toLocaleString()})
          </Link> */}
        </nav>
      </div>
    </header>
  );
}

