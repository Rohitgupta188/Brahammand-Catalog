import { z } from "zod";
import { MAX_PDF_PRODUCTS } from "@/lib/types";

export const filtersSchema = z.object({
  category: z.string().trim().max(120).optional(),
  collections: z.array(z.string().trim().max(120)).optional(),
  minWeight: z.number().min(0).optional(),
  maxWeight: z.number().min(0).optional(),
  search: z.string().trim().max(100).optional(),
  hasImage: z.boolean().optional(),
});

export const pdfRequestSchema = z.object({
  filters: filtersSchema,
  selectionMode: z.enum(["all", "custom"]),
  selectedIds: z.array(z.string().trim()).max(MAX_PDF_PRODUCTS).optional(),
  excludedIds: z.array(z.string().trim()).max(10000).optional(),
  includedNoPhotoIds: z.array(z.string().trim()).max(MAX_PDF_PRODUCTS).optional(),
});

export function parseOptionalFloat(value: string | null): number | undefined {
  if (!value || !value.trim()) return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

