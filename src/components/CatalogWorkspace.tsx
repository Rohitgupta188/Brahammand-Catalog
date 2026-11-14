"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ImageOff,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  MAX_PDF_PRODUCTS,
  type CatalogFilters,
  type CatalogProductItem,
  type FilterOptionsPayload,
  type ProductsResponse,
} from "@/lib/types";
import { formatWeight } from "@/lib/formatters";

interface CatalogWorkspaceProps {
  initialFilters: FilterOptionsPayload;
}

function ProductCard({
  item,
  selected,
  onToggle,
}: {
  item: CatalogProductItem;
  selected: boolean;
  onToggle: (item: CatalogProductItem) => void;
}) {
  const hasPhoto = Boolean(item.thumbUrl);
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = hasPhoto && !imgFailed;

  // Line 1: Gross W (left) and Net W (right)
  const line1Left = `Gross W ${item.grossWeight.toFixed(2)} g`;
  const line1Right = `Net W ${item.netWeight.toFixed(2)} g`;

  // Line 2: Stone W (left), CZ (right)
  const hasStone = item.stoneWeight !== null && item.stoneWeight > 0;
  const hasCz = item.czWeight !== null && item.czWeight > 0;
  const line2Left = hasStone ? `Stone W ${formatWeight(item.stoneWeight!)}` : null;
  const line2Right = hasCz ? `CZ ${formatWeight(item.czWeight!)}` : null;

  // Line 3: BS (left) and Purity (right)
  const hasBs = item.bsWeight !== null && item.bsWeight > 0;
  const hasPurity = Boolean(item.purityLabel);
  const line3Left = hasBs ? `BS ${formatWeight(item.bsWeight!)}` : null;
  const line3Right = hasPurity ? `Purity ${item.purityLabel}` : null;

  return (
    <button
      type="button"
      onClick={() => onToggle(item)}
      className={`group relative flex flex-col p-3.5 sm:p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8e6327] ${
        selected
          ? "bg-white ring-2 ring-[#8e6327] shadow-sm"
          : hasPhoto
          ? "bg-white ring-1 ring-[#e5ded0] opacity-75 hover:opacity-100"
          : "bg-[#fdfcf9] ring-1 ring-dashed ring-[#d8cfbe] opacity-65 hover:opacity-95"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-3.5 right-3.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border text-xs transition ${
          selected
            ? "border-[#8e6327] bg-[#8e6327] text-white"
            : hasPhoto
            ? "border-[#c7beb0] bg-white/90 text-transparent group-hover:border-[#8e6327]"
            : "border-[#d8cfbe] bg-white/80 text-transparent group-hover:border-[#8e6327]"
        }`}
      >
        <Check className="h-3 w-3 stroke-[2.5]" />
      </span>

      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-[#f2efe6]">
        {showImage ? (
          // ImageKit URLs are pre-sized with ?tr=w-400
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbUrl!}
            alt={item.displayDesignNumber}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain p-1 transition duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 px-3 text-center text-[#8a8378]">
            <ImageOff className="h-6 w-6 stroke-[1.5]" />
            <span className="text-[11px] font-medium">Photo not available</span>
            {!selected ? (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                Excluded from PDF
              </span>
            ) : (
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                Included in PDF
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3.5">
        <div className="flex items-baseline justify-between gap-1 pb-0.5">
          <span className="truncate font-serif text-base font-bold text-[#2a2722]">
            {item.displayDesignNumber}
          </span>
          {item.collection ? (
            <span className="shrink-0 text-[11px] font-semibold tracking-wider text-[#8e6327] uppercase">
              {item.collection}
            </span>
          ) : null}
        </div>
        <div className="my-2.5 h-px w-full bg-[#dba74f]" />
        <div className="space-y-1.5 text-xs text-[#6e685f]">
          <div className="grid grid-cols-2 gap-2 pl-1">
            <span className="truncate">{line1Left}</span>
            <span className="truncate">{line1Right}</span>
          </div>
          {line2Left || line2Right ? (
            <div className="grid grid-cols-2 gap-2 pl-1">
              <span className="truncate">{line2Left ?? line2Right}</span>
              {line2Left && line2Right ? (
                <span className="truncate">{line2Right}</span>
              ) : null}
            </div>
          ) : null}
          {line3Left || line3Right ? (
            <div className="grid grid-cols-2 gap-2 pl-1">
              <span className="truncate">{line3Left ?? line3Right}</span>
              {line3Left && line3Right ? (
                <span className="truncate">{line3Right}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function CatalogWorkspace({ initialFilters }: CatalogWorkspaceProps) {
  const [category, setCategory] = useState<string>("");
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [minWeightInput, setMinWeightInput] = useState<string>("");
  const [maxWeightInput, setMaxWeightInput] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [productsData, setProductsData] = useState<ProductsResponse>({
    items: [],
    total: 0,
    totalWithPhotos: 0,
    page: 1,
    pageSize: 60,
    totalPages: 1,
  });
  const [loadedQueryKey, setLoadedQueryKey] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [onlyWithPhotos, setOnlyWithPhotos] = useState<boolean>(true);
  const [includedNoPhotoIds, setIncludedNoPhotoIds] = useState<Set<string>>(
    () => new Set()
  );
  const [selectionMode, setSelectionMode] = useState<"all" | "custom">("all");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [readyPdf, setReadyPdf] = useState<{
    url: string;
    filename: string;
    count: number;
  } | null>(null);

  const readyPdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    return () => {
      if (readyPdfUrlRef.current) {
        URL.revokeObjectURL(readyPdfUrlRef.current);
      }
    };
  }, []);

  function clearReadyPdf() {
    if (readyPdfUrlRef.current) {
      URL.revokeObjectURL(readyPdfUrlRef.current);
      readyPdfUrlRef.current = null;
    }
    setReadyPdf(null);
    setPdfError(null);
  }

  function resetSelectionToAll() {
    setSelectionMode("all");
    setExcludedIds(new Set());
    setSelectedIds(new Set());
    setIncludedNoPhotoIds(new Set());
    clearReadyPdf();
  }

  function handleToggleOnlyWithPhotos(nextVal: boolean) {
    setOnlyWithPhotos(nextVal);
    setPage(1);
    resetSelectionToAll();
  }

  const activeCategoryMeta = useMemo(
    () => initialFilters.categories.find((c) => c.name === category) ?? null,
    [initialFilters.categories, category]
  );

  const availableCollections = useMemo(
    () =>
      activeCategoryMeta
        ? activeCategoryMeta.collections
        : initialFilters.allCollections,
    [activeCategoryMeta, initialFilters.allCollections]
  );

  const activeFilters: CatalogFilters = useMemo(() => {
    const minVal = minWeightInput.trim() ? Number(minWeightInput) : undefined;
    const maxVal = maxWeightInput.trim() ? Number(maxWeightInput) : undefined;
    return {
      category: category || undefined,
      collections:
        selectedCollections.length > 0 ? selectedCollections : undefined,
      minWeight:
        typeof minVal === "number" && Number.isFinite(minVal) && minVal >= 0
          ? minVal
          : undefined,
      maxWeight:
        typeof maxVal === "number" && Number.isFinite(maxVal) && maxVal >= 0
          ? maxVal
          : undefined,
      search: debouncedSearch || undefined,
      hasImage: onlyWithPhotos ? true : undefined,
    };
  }, [
    category,
    selectedCollections,
    minWeightInput,
    maxWeightInput,
    debouncedSearch,
    onlyWithPhotos,
  ]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (activeFilters.category) params.set("category", activeFilters.category);
    for (const c of activeFilters.collections ?? []) {
      params.append("collection", c);
    }
    if (typeof activeFilters.minWeight === "number") {
      params.set("min", String(activeFilters.minWeight));
    }
    if (typeof activeFilters.maxWeight === "number") {
      params.set("max", String(activeFilters.maxWeight));
    }
    if (activeFilters.search) {
      params.set("search", activeFilters.search);
    }
    if (onlyWithPhotos) {
      params.set("hasImage", "true");
    } else {
      params.set("hasImage", "false");
    }
    params.set("page", String(page));
    return params.toString();
  }, [activeFilters, onlyWithPhotos, page]);

  const loading = loadedQueryKey !== queryString;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/products?${queryString}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || "Failed to load products");
        }
        return res.json() as Promise<ProductsResponse>;
      })
      .then((data) => {
        setProductsData(data);
        setFetchError(null);
        setLoadedQueryKey(queryString);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setFetchError(
          err instanceof Error ? err.message : "Failed to load products"
        );
        setLoadedQueryKey(queryString);
      });

    return () => controller.abort();
  }, [queryString]);

  function handleCategoryChange(nextCategory: string) {
    setCategory(nextCategory);
    setSelectedCollections([]);
    setPage(1);
    resetSelectionToAll();
  }

  function handleCollectionToggle(value: string) {
    setSelectedCollections((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    setPage(1);
    resetSelectionToAll();
  }

  function handleWeightChange(kind: "min" | "max", value: string) {
    if (kind === "min") setMinWeightInput(value);
    else setMaxWeightInput(value);
    setPage(1);
    resetSelectionToAll();
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
    resetSelectionToAll();
  }

  function handleClearAllFilters() {
    setCategory("");
    setSelectedCollections([]);
    setMinWeightInput("");
    setMaxWeightInput("");
    setSearchInput("");
    setDebouncedSearch("");
    setPage(1);
    resetSelectionToAll();
  }

  function isItemSelected(item: CatalogProductItem): boolean {
    if (selectionMode === "custom") {
      return selectedIds.has(item.id);
    }
    const hasPhoto = Boolean(item.thumbUrl);
    if (hasPhoto) {
      return !excludedIds.has(item.id);
    }
    // Designs without photos are automatically deselected by default in "all" mode
    return includedNoPhotoIds.has(item.id);
  }

  function handleToggleItem(item: CatalogProductItem) {
    clearReadyPdf();
    const hasPhoto = Boolean(item.thumbUrl);
    const currentlySelected = isItemSelected(item);

    if (selectionMode === "all") {
      if (hasPhoto) {
        setExcludedIds((prev) => {
          const next = new Set(prev);
          if (currentlySelected) next.add(item.id);
          else next.delete(item.id);
          return next;
        });
      } else {
        setIncludedNoPhotoIds((prev) => {
          const next = new Set(prev);
          if (currentlySelected) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
      }
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (currentlySelected) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    }
  }

  function handleSelectAll() {
    resetSelectionToAll();
  }

  function handleDeselectAll() {
    setSelectionMode("custom");
    setSelectedIds(new Set());
    setExcludedIds(new Set());
    setIncludedNoPhotoIds(new Set());
    clearReadyPdf();
  }

  const selectedCount = useMemo(() => {
    if (selectionMode === "custom") {
      return selectedIds.size;
    }
    const basePhotoCount = onlyWithPhotos
      ? productsData.total
      : (productsData.totalWithPhotos ?? productsData.total);
    const photoSelected = Math.max(0, basePhotoCount - excludedIds.size);
    return photoSelected + includedNoPhotoIds.size;
  }, [
    selectionMode,
    selectedIds.size,
    onlyWithPhotos,
    productsData.total,
    productsData.totalWithPhotos,
    excludedIds.size,
    includedNoPhotoIds.size,
  ]);

  const overCap = selectedCount > MAX_PDF_PRODUCTS;
  const canGenerate =
    !loading && !isGenerating && selectedCount > 0 && !overCap;

  const hasAnyFilter = Boolean(
    category ||
      selectedCollections.length > 0 ||
      minWeightInput.trim() ||
      maxWeightInput.trim() ||
      searchInput.trim() ||
      !onlyWithPhotos
  );

  async function handleGeneratePdf() {
    if (!canGenerate) return;
    setIsGenerating(true);
    clearReadyPdf();

    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: activeFilters,
          selectionMode,
          selectedIds:
            selectionMode === "custom" ? [...selectedIds] : undefined,
          excludedIds:
            selectionMode === "all" && excludedIds.size > 0
              ? [...excludedIds]
              : undefined,
          includedNoPhotoIds:
            selectionMode === "all" && includedNoPhotoIds.size > 0
              ? [...includedNoPhotoIds]
              : undefined,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "brahammand-catalog.pdf";
      const countHeader = Number(res.headers.get("X-Product-Count") || selectedCount);

      const url = URL.createObjectURL(blob);
      readyPdfUrlRef.current = url;
      setReadyPdf({ url, filename, count: countHeader });

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "Failed to generate PDF"
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const weightPlaceholderMin = activeCategoryMeta
    ? activeCategoryMeta.minWeight.toFixed(2)
    : initialFilters.minWeight.toFixed(2);
  const weightPlaceholderMax = activeCategoryMeta
    ? activeCategoryMeta.maxWeight.toFixed(2)
    : initialFilters.maxWeight.toFixed(2);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      {/* Filters */}
      <section className="rounded-xl border border-[#e5ded0] bg-white p-4 shadow-xs sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <label
              htmlFor="category-select"
              className="mb-1.5 block text-xs font-semibold tracking-wider text-[#6e685f] uppercase"
            >
              Category
            </label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full rounded-lg border border-[#d8cfbe] bg-[#faf8f3] px-3 py-2 text-sm text-[#2a2722] focus:border-[#8e6327] focus:outline-none"
            >
              <option value="">
                All Categories ({initialFilters.totalCatalogue.toLocaleString()})
              </option>
              {initialFilters.categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-[#6e685f] uppercase">
              Gross Weight Range (g)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={minWeightInput}
                onChange={(e) => handleWeightChange("min", e.target.value)}
                placeholder={`Min ${weightPlaceholderMin}`}
                aria-label="Minimum gross weight in grams"
                className="w-full rounded-lg border border-[#d8cfbe] bg-[#faf8f3] px-3 py-2 text-sm text-[#2a2722] placeholder:text-[#9a9286] focus:border-[#8e6327] focus:outline-none"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={maxWeightInput}
                onChange={(e) => handleWeightChange("max", e.target.value)}
                placeholder={`Max ${weightPlaceholderMax}`}
                aria-label="Maximum gross weight in grams"
                className="w-full rounded-lg border border-[#d8cfbe] bg-[#faf8f3] px-3 py-2 text-sm text-[#2a2722] placeholder:text-[#9a9286] focus:border-[#8e6327] focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="design-search"
              className="mb-1.5 block text-xs font-semibold tracking-wider text-[#6e685f] uppercase"
            >
              Design Number
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#8a8378]" />
              <input
                id="design-search"
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="e.g. TRLR223, DZBL..."
                className="w-full rounded-lg border border-[#d8cfbe] bg-[#faf8f3] py-2 pr-3 pl-9 text-sm text-[#2a2722] placeholder:text-[#9a9286] focus:border-[#8e6327] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Collections multi-select & photo toggle */}
        <div className="mt-4 border-t border-[#efe9dc] pt-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold tracking-wider text-[#6e685f] uppercase">
              Collections{" "}
              {selectedCollections.length > 0
                ? `(${selectedCollections.length} selected)`
                : "(All)"}
            </span>

            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="photos-only-toggle"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#d8cfbe] bg-[#faf8f3] px-3 py-1 text-xs font-medium text-[#2a2722] transition hover:border-[#8e6327]"
              >
                <input
                  id="photos-only-toggle"
                  type="checkbox"
                  checked={onlyWithPhotos}
                  onChange={(e) => handleToggleOnlyWithPhotos(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#c7beb0] text-[#8e6327] accent-[#8e6327] focus:ring-[#8e6327]"
                />
                <span>Only designs with photos</span>
              </label>

              {hasAnyFilter ? (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#8e6327] hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset filters
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {availableCollections.map((coll) => {
              const active = selectedCollections.includes(coll.value);
              return (
                <button
                  key={coll.value}
                  type="button"
                  onClick={() => handleCollectionToggle(coll.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "border-[#8e6327] bg-[#8e6327] text-white"
                      : "border-[#dfd7c8] bg-[#faf8f3] text-[#4a453e] hover:border-[#8e6327]"
                  }`}
                >
                  <span>{coll.label}</span>
                  <span
                    className={active ? "text-[#f5e7ce]" : "text-[#8a8378]"}
                  >
                    {coll.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sticky Selection & PDF Action Bar */}
      <section className="sticky top-2 z-20 mt-4 rounded-xl border border-[#dfd7c8] bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-[#2a2722]">
              <span className="font-semibold">
                {productsData.total.toLocaleString()}
              </span>{" "}
              matching {productsData.total === 1 ? "design" : "designs"}
              {!onlyWithPhotos && productsData.totalWithPhotos !== undefined ? (
                <span className="ml-1 text-xs text-[#6e685f]">
                  ({productsData.totalWithPhotos.toLocaleString()} with photos)
                </span>
              ) : null}
              <span className="mx-2 text-[#c7beb0]">|</span>
              <span
                className={`font-semibold ${
                  overCap ? "text-amber-700" : "text-[#8e6327]"
                }`}
              >
                {selectedCount.toLocaleString()} selected
              </span>
              <span className="ml-1 text-xs text-[#6e685f]">
                (max {MAX_PDF_PRODUCTS} per PDF)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={productsData.total === 0}
                title={
                  !onlyWithPhotos
                    ? "Select all designs with photos"
                    : "Select all matching designs"
                }
                className="rounded-md border border-[#d8cfbe] bg-[#faf8f3] px-2.5 py-1 text-xs font-medium text-[#2a2722] transition hover:border-[#8e6327] disabled:opacity-40"
              >
                Select All {!onlyWithPhotos ? "(Photos)" : ""}
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={productsData.total === 0}
                className="rounded-md border border-[#d8cfbe] bg-[#faf8f3] px-2.5 py-1 text-xs font-medium text-[#2a2722] transition hover:border-[#8e6327] disabled:opacity-40"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {overCap ? (
              <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                Narrow your filters or select up to {MAX_PDF_PRODUCTS}
              </span>
            ) : null}

            {readyPdf ? (
              <a
                href={readyPdf.url}
                download={readyPdf.filename}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#8e6327] bg-[#faf5ea] px-3.5 py-2 text-sm font-medium text-[#8e6327] transition hover:bg-[#f2e6ce]"
              >
                <Download className="h-4 w-4" />
                Download PDF ({readyPdf.count})
              </a>
            ) : null}

            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={!canGenerate}
              className="inline-flex items-center gap-2 rounded-lg bg-[#8e6327] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#77521f] disabled:cursor-not-allowed disabled:bg-[#c8bfb0]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building PDF ({selectedCount})...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate PDF
                </>
              )}
            </button>
          </div>
        </div>

        {pdfError ? (
          <div className="mt-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700 ring-1 ring-red-200">
            {pdfError}
          </div>
        ) : null}
      </section>

      {/* Product Grid */}
      <section className="mt-6">
        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {fetchError}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-5 lg:gap-6">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse bg-white p-3.5 sm:p-4 ring-1 ring-[#e5ded0]"
              >
                <div className="aspect-square w-full bg-[#f2efe6]" />
                <div className="mt-3.5 h-5 w-2/3 rounded bg-[#eee8dc]" />
                <div className="my-2.5 h-px w-full bg-[#efe8d8]" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-1/3 rounded bg-[#f2efe6]" />
                    <div className="h-3 w-1/3 rounded bg-[#f2efe6]" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-1/3 rounded bg-[#f2efe6]" />
                    <div className="h-3 w-1/3 rounded bg-[#f2efe6]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : productsData.items.length === 0 ? (
          <div className="rounded-xl border border-[#e5ded0] bg-white p-12 text-center">
            <p className="font-serif text-lg text-[#2a2722]">
              No matching designs found
            </p>
            <p className="mt-1 text-sm text-[#6e685f]">
              Try widening your weight range or clearing a collection filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-5 lg:gap-6">
            {productsData.items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                selected={isItemSelected(item)}
                onToggle={handleToggleItem}
              />
            ))}
          </div>
        )}
      </section>

      {/* Pagination */}
      {productsData.totalPages > 1 ? (
        <nav
          aria-label="Catalog pagination"
          className="mt-6 flex items-center justify-between rounded-xl border border-[#e5ded0] bg-white px-4 py-3 text-sm"
        >
          <span className="text-[#6e685f]">
            Page <strong className="text-[#2a2722]">{productsData.page}</strong>{" "}
            of{" "}
            <strong className="text-[#2a2722]">
              {productsData.totalPages}
            </strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#d8cfbe] bg-[#faf8f3] px-3 py-1.5 font-medium text-[#2a2722] transition hover:border-[#8e6327] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= productsData.totalPages || loading}
              onClick={() => {
                setPage((p) => Math.min(productsData.totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#d8cfbe] bg-[#faf8f3] px-3 py-1.5 font-medium text-[#2a2722] transition hover:border-[#8e6327] disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      ) : null}
    </main>
  );
}
