"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import type { CatalogProductItem } from "@/lib/types";

interface MissingPhotosResponse {
  totalMissing: number;
  byCategory: { category: string; count: number }[];
  items: CatalogProductItem[];
  page: number;
  totalPages: number;
}

export function MissingPhotosClient() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<MissingPhotosResponse | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (selectedCategory) queryParams.set("category", selectedCategory);
  queryParams.set("page", String(page));
  const queryString = queryParams.toString();
  const loading = loadedKey !== queryString;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/missing-photos?${queryString}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || "Failed to load missing photos");
        }
        return res.json() as Promise<MissingPhotosResponse>;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
        setLoadedKey(queryString);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Failed to load missing photos"
        );
        setLoadedKey(queryString);
      });

    return () => controller.abort();
  }, [queryString]);

  function handleDownloadCsv() {
    if (!data) return;
    const rows = [
      ["Design Number", "Raw Design Number", "Category", "Collection", "Expected Image Name"],
      ...data.items.map((item) => [
        item.displayDesignNumber,
        item.designNumber,
        item.category,
        item.collection || "Other",
        item.imageName ?? "",
      ]),
    ];
    const csv = rows
      .map((cols) =>
        cols.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `missing-photos-page-${data.page}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <section className="rounded-xl border border-[#e5ded0] bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-[#2a2722]">
              Catalogue Designs Without Synced Image URL
            </h2>
            <p className="mt-0.5 text-sm text-[#6e685f]">
              These designs appear with a placeholder in the catalog &amp; PDF
              until the existing Drive-to-Backblaze sync populates{" "}
              <code className="rounded bg-[#f2efe6] px-1.5 py-0.5 text-xs">
                imageUrl
              </code>
              .
            </p>
          </div>

          <button
            type="button"
            disabled={!data || data.items.length === 0}
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8cfbe] bg-[#faf8f3] px-3 py-2 text-xs font-semibold text-[#2a2722] transition hover:border-[#8e6327] disabled:opacity-40"
          >
            <Download className="h-4 w-4 text-[#8e6327]" />
            Export Page CSV
          </button>
        </div>

        {data ? (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#efe9dc] pt-4">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("");
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                selectedCategory === ""
                  ? "border-[#8e6327] bg-[#8e6327] text-white"
                  : "border-[#dfd7c8] bg-[#faf8f3] text-[#4a453e] hover:border-[#8e6327]"
              }`}
            >
              All ({data.totalMissing.toLocaleString()})
            </button>
            {data.byCategory.map((cat) => {
              const active = selectedCategory === cat.category;
              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.category);
                    setPage(1);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "border-[#8e6327] bg-[#8e6327] text-white"
                      : "border-[#dfd7c8] bg-[#faf8f3] text-[#4a453e] hover:border-[#8e6327]"
                  }`}
                >
                  {cat.category} ({cat.count.toLocaleString()})
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-[#e5ded0] bg-white shadow-xs">
        {error ? (
          <div className="p-6 text-center text-sm text-red-700">{error}</div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-[#6e685f]">
            <Loader2 className="h-4 w-4 animate-spin text-[#8e6327]" />
            Loading missing photos...
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#6e685f]">
            No missing photos found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#e5ded0] bg-[#faf8f3] text-xs font-semibold tracking-wider text-[#6e685f] uppercase">
                  <th className="px-4 py-3">Design Number</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Collection</th>
                  <th className="px-4 py-3">Gross / Net</th>
                  <th className="px-4 py-3">Expected Image File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efe9dc]">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#faf8f3]/70">
                    <td className="px-4 py-2.5 font-serif font-medium text-[#2a2722]">
                      {item.displayDesignNumber}
                    </td>
                    <td className="px-4 py-2.5 text-[#4a453e]">
                      {item.category}
                    </td>
                    <td className="px-4 py-2.5 text-[#6e685f]">
                      {item.collection || "Other"}
                    </td>
                    <td className="px-4 py-2.5 text-[#6e685f]">
                      {item.grossWeight.toFixed(2)} g /{" "}
                      {item.netWeight.toFixed(2)} g
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#6e685f]">
                      {item.imageName || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data && data.totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between rounded-xl border border-[#e5ded0] bg-white px-4 py-3 text-sm">
          <span className="text-[#6e685f]">
            Page <strong className="text-[#2a2722]">{data.page}</strong> of{" "}
            <strong className="text-[#2a2722]">{data.totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[#d8cfbe] bg-[#faf8f3] px-3 py-1.5 font-medium text-[#2a2722] transition hover:border-[#8e6327] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.totalPages || loading}
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
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
