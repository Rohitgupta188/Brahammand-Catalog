import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CatalogWorkspace } from "@/components/CatalogWorkspace";
import { getFilterOptions } from "@/lib/catalog";

async function CatalogShell() {
  const initialFilters = await getFilterOptions();
  return (
    <>
      <AppHeader
        totalCatalogue={initialFilters.totalCatalogue}
        missingPhotoCount={initialFilters.missingPhotoCount}
        activeRoute="catalog"
      />
      <CatalogWorkspace initialFilters={initialFilters} />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f1e8] text-sm text-[#6e685f]">
          Loading Brahammand Catalog...
        </div>
      }
    >
      <CatalogShell />
    </Suspense>
  );
}
