import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  queryCatalogProducts,
} from "@/lib/catalog";
import { filtersSchema, parseOptionalFloat } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  try {
    const rawCollections = params.getAll("collection");
    const commaCollections = params.get("collections");
    const collections = [
      ...rawCollections,
      ...(commaCollections
        ? commaCollections.split(",").map((v) => v.trim())
        : []),
    ].filter(Boolean);

    const rawHasImage = params.get("hasImage");
    const hasImage =
      rawHasImage === "true"
        ? true
        : rawHasImage === "false"
        ? false
        : undefined;

    const parsed = filtersSchema.safeParse({
      category: params.get("category") || undefined,
      collections: collections.length > 0 ? collections : undefined,
      minWeight: parseOptionalFloat(params.get("min")),
      maxWeight: parseOptionalFloat(params.get("max")),
      search: params.get("search") || undefined,
      hasImage,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid filter parameters", details: z.flattenError(parsed.error) },
        { status: 400 }
      );
    }

    const page = Math.max(1, Number(params.get("page") || "1") || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(params.get("pageSize") || String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE)
    );

    const result = await queryCatalogProducts(parsed.data, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to query products:", error);
    return NextResponse.json(
      { error: "Failed to load catalog products" },
      { status: 500 }
    );
  }
}
