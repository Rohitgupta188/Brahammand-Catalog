import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { MissingPhotosClient } from "@/components/MissingPhotosClient";
import { getFilterOptions } from "@/lib/catalog";

async function MissingPhotosShell() {
  const filters = await getFilterOptions();
  return (
    <>
      <AppHeader
        totalCatalogue={filters.totalCatalogue}
        missingPhotoCount={filters.missingPhotoCount}
        activeRoute="missing-photos"
      />
      <MissingPhotosClient />
    </>
  );
}

export default function MissingPhotosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f1e8] text-sm text-[#6e685f]">
          Loading missing photos report...
        </div>
      }
    >
      <MissingPhotosShell />
    </Suspense>
  );
}

