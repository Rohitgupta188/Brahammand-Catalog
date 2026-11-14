import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MAX_PDF_PRODUCTS, resolveProductsForPdf } from "@/lib/catalog";
import { buildCatalogPdf } from "@/lib/pdf";
import { pdfRequestSchema } from "@/lib/validation";

export const maxDuration = 300;

function sanitizeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = pdfRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid PDF request", details: z.flattenError(parsed.error) },
        { status: 400 }
      );
    }

    const { filters, selectionMode, selectedIds, excludedIds, includedNoPhotoIds } =
      parsed.data;
    const { items, totalSelected } = await resolveProductsForPdf({
      filters,
      selectionMode,
      selectedIds,
      excludedIds,
      includedNoPhotoIds,
    });

    if (totalSelected === 0) {
      return NextResponse.json(
        { error: "No matching products selected for PDF generation." },
        { status: 400 }
      );
    }

    if (totalSelected > MAX_PDF_PRODUCTS) {
      return NextResponse.json(
        {
          error: `Narrow your filters or select up to ${MAX_PDF_PRODUCTS} products (currently ${totalSelected}).`,
        },
        { status: 400 }
      );
    }

    const pdfBytes = await buildCatalogPdf(items, filters);
    const categorySlug = filters.category
      ? sanitizeFilenamePart(filters.category)
      : "all-categories";
    const dateSlug = new Date().toISOString().slice(0, 10);
    const filename = `brahammand-${categorySlug || "catalog"}-${dateSlug}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Product-Count": String(items.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return NextResponse.json(
      { error: "Failed to build PDF. Please try again." },
      { status: 500 }
    );
  }
}

