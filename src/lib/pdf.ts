import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import {
  OTHER_COLLECTION_VALUE,
  type CatalogFilters,
  type CatalogProductItem,
} from "@/lib/types";
import { formatWeight } from "@/lib/formatters";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const MARGIN_X = 26;
const MARGIN_BOTTOM = 22;
const GRID_TOP_Y = 744;
const COL_COUNT = 3;
const ROW_COUNT = 3;
const CARDS_PER_PAGE = COL_COUNT * ROW_COUNT;
const COL_GAP = 12;
const ROW_GAP = 12;

const COLOR_PAGE_BG = rgb(0.961, 0.945, 0.91); // #F5F1E8
const COLOR_BRAND_GOLD = rgb(0.557, 0.388, 0.153); // #8E6327
const COLOR_CARD_RULE = rgb(0.859, 0.655, 0.31); // #DBA74F
const COLOR_INK = rgb(0.165, 0.153, 0.133); // #2A2722
const COLOR_MUTED = rgb(0.431, 0.408, 0.373); // #6E685F
const COLOR_CARD_BG = rgb(1, 1, 1); // #FFFFFF
const COLOR_IMG_BG = rgb(0.949, 0.937, 0.902); // #F2EFE6
const COLOR_PLACEHOLDER_BORDER = rgb(0.76, 0.74, 0.7);

function toWinAnsiSafe(input: string): string {
  return input
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

function drawTrackedText(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
    tracking: number;
  }
) {
  const safe = toWinAnsiSafe(text);
  let cursorX = opts.x;
  for (const ch of safe) {
    page.drawText(ch, {
      x: cursorX,
      y: opts.y,
      size: opts.size,
      font: opts.font,
      color: opts.color,
    });
    cursorX += opts.font.widthOfTextAtSize(ch, opts.size) + opts.tracking;
  }
}

function fitText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string {
  const safe = toWinAnsiSafe(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) {
    return safe;
  }
  const ellipsis = "...";
  let trimmed = safe;
  while (
    trimmed.length > 1 &&
    font.widthOfTextAtSize(trimmed + ellipsis, size) > maxWidth
  ) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed + ellipsis;
}

function buildFilterSubtitle(
  filters: CatalogFilters,
  totalItems: number
): string {
  const parts: string[] = [];

  if (filters.collections && filters.collections.length > 0) {
    const labels = filters.collections.map((c) =>
      c === OTHER_COLLECTION_VALUE ? "Other" : c
    );
    parts.push(labels.join(" \u00B7 "));
  }

  const hasMin =
    typeof filters.minWeight === "number" && Number.isFinite(filters.minWeight);
  const hasMax =
    typeof filters.maxWeight === "number" && Number.isFinite(filters.maxWeight);
  if (hasMin && hasMax) {
    parts.push(
      `${filters.minWeight!.toFixed(2)} to ${filters.maxWeight!.toFixed(2)} g`
    );
  } else if (hasMin) {
    parts.push(`From ${filters.minWeight!.toFixed(2)} g`);
  } else if (hasMax) {
    parts.push(`Up to ${filters.maxWeight!.toFixed(2)} g`);
  }

  if (filters.search && filters.search.trim()) {
    parts.push(`Search: ${filters.search.trim()}`);
  }

  if (parts.length === 0) {
    return `All collections \u00B7 ${totalItems} ${totalItems === 1 ? "design" : "designs"}`;
  }

  return parts.join(" \u00B7 ");
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchImagesInBatches(
  items: CatalogProductItem[],
  concurrency = 16
): Promise<Map<string, Uint8Array | null>> {
  const results = new Map<string, Uint8Array | null>();
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      if (!current.printUrl) {
        results.set(current.id, null);
        continue;
      }
      const bytes = await fetchImageBytes(current.printUrl);
      results.set(current.id, bytes);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function buildCatalogPdf(
  items: CatalogProductItem[],
  filters: CatalogFilters
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("Brahammand Jewels Catalog");
  pdfDoc.setCreator("Brahammand Catalog");

  const serifFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const sansFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const rawImageMap = await fetchImagesInBatches(items, 8);
  const embeddedImages = new Map<string, PDFImage | null>();

  for (const item of items) {
    const bytes = rawImageMap.get(item.id);
    if (!bytes) {
      embeddedImages.set(item.id, null);
      continue;
    }
    try {
      const img = await pdfDoc.embedJpg(bytes);
      embeddedImages.set(item.id, img);
    } catch {
      try {
        const img = await pdfDoc.embedPng(bytes);
        embeddedImages.set(item.id, img);
      } catch {
        embeddedImages.set(item.id, null);
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(items.length / CARDS_PER_PAGE));
  const headingText = toWinAnsiSafe(
    filters.category?.trim() ? filters.category.trim() : "All categories"
  );
  const subtitleText = fitText(
    buildFilterSubtitle(filters, items.length),
    sansFont,
    8.5,
    A4_WIDTH - MARGIN_X * 2
  );

  const gridWidth = A4_WIDTH - MARGIN_X * 2;
  const gridHeight = GRID_TOP_Y - MARGIN_BOTTOM;
  const cardW = (gridWidth - COL_GAP * (COL_COUNT - 1)) / COL_COUNT;
  const cardH = (gridHeight - ROW_GAP * (ROW_COUNT - 1)) / ROW_COUNT;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

    // Warm ivory background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: A4_WIDTH,
      height: A4_HEIGHT,
      color: COLOR_PAGE_BG,
    });

    // Top bar: Brand left, Page X of Y right
    drawTrackedText(page, "Brahammand Jewels", {
      x: MARGIN_X,
      y: 812,
      size: 9.5,
      font: sansFont,
      color: COLOR_BRAND_GOLD,
      tracking: 1.1,
    });

    const pageLabel = `Page ${pageIdx + 1} of ${totalPages}`;
    const pageLabelW = sansFont.widthOfTextAtSize(pageLabel, 8.5);
    page.drawText(pageLabel, {
      x: A4_WIDTH - MARGIN_X - pageLabelW,
      y: 812,
      size: 8.5,
      font: sansFont,
      color: COLOR_MUTED,
    });

    // Top gold divider line
    page.drawLine({
      start: { x: MARGIN_X, y: 803 },
      end: { x: A4_WIDTH - MARGIN_X, y: 803 },
      thickness: 0.9,
      color: COLOR_BRAND_GOLD,
    });

    // Category heading & filter subtitle
    page.drawText(fitText(headingText, serifFont, 19, gridWidth), {
      x: MARGIN_X,
      y: 778,
      size: 19,
      font: serifFont,
      color: COLOR_INK,
    });

    page.drawText(subtitleText, {
      x: MARGIN_X,
      y: 762,
      size: 8.5,
      font: sansFont,
      color: COLOR_MUTED,
    });

    // 3x3 product cards (9 per page)
    const pageItems = items.slice(
      pageIdx * CARDS_PER_PAGE,
      (pageIdx + 1) * CARDS_PER_PAGE
    );

    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i];
      const col = i % COL_COUNT;
      const row = Math.floor(i / COL_COUNT);

      const cardX = MARGIN_X + col * (cardW + COL_GAP);
      const cardTopY = GRID_TOP_Y - row * (cardH + ROW_GAP);
      const cardY = cardTopY - cardH;

      // White card container
      page.drawRectangle({
        x: cardX,
        y: cardY,
        width: cardW,
        height: cardH,
        color: COLOR_CARD_BG,
      });

      const pad = 6;
      const innerW = cardW - pad * 2;
      const imgBoxH = 160;
      const imgBoxX = cardX + pad;
      const imgBoxY = cardTopY - pad - imgBoxH;

      // Image background box
      page.drawRectangle({
        x: imgBoxX,
        y: imgBoxY,
        width: innerW,
        height: imgBoxH,
        color: COLOR_IMG_BG,
      });

      const embedded = embeddedImages.get(item.id);
      if (embedded) {
        const inset = 3;
        const maxW = innerW - inset * 2;
        const maxH = imgBoxH - inset * 2;
        const scale = Math.min(maxW / embedded.width, maxH / embedded.height);
        const drawW = embedded.width * scale;
        const drawH = embedded.height * scale;
        page.drawImage(embedded, {
          x: imgBoxX + (innerW - drawW) / 2,
          y: imgBoxY + (imgBoxH - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      } else {
        // Subtle placeholder frame matching mockup
        const iconSize = 18;
        page.drawRectangle({
          x: imgBoxX + (innerW - iconSize) / 2,
          y: imgBoxY + (imgBoxH - iconSize) / 2 + 6,
          width: iconSize,
          height: iconSize,
          borderColor: COLOR_PLACEHOLDER_BORDER,
          borderWidth: 0.85,
        });
        const noPhotoText = "Photo not available";
        const noPhotoW = sansFont.widthOfTextAtSize(noPhotoText, 7.5);
        page.drawText(noPhotoText, {
          x: imgBoxX + (innerW - noPhotoW) / 2,
          y: imgBoxY + (imgBoxH - iconSize) / 2 - 9,
          size: 7.5,
          font: sansFont,
          color: COLOR_MUTED,
        });
      }

      // Design Number on left, Collection on right
      const designY = imgBoxY - 13;
      page.drawText(
        fitText(item.displayDesignNumber, serifBold, 11, innerW - 45),
        {
          x: imgBoxX,
          y: designY,
          size: 11,
          font: serifBold,
          color: COLOR_INK,
        }
      );

      if (item.collection) {
        const coll = String(item.collection).trim();
        const collW = sansFont.widthOfTextAtSize(coll, 7.5);
        page.drawText(coll, {
          x: imgBoxX + innerW - collW,
          y: designY + 1,
          size: 7.5,
          font: sansFont,
          color: COLOR_BRAND_GOLD,
        });
      }

      // Gold card divider line
      const ruleY = designY - 5;
      page.drawLine({
        start: { x: imgBoxX, y: ruleY },
        end: { x: imgBoxX + innerW, y: ruleY },
        thickness: 0.75,
        color: COLOR_CARD_RULE,
      });

      // Fixed vertical column lines for perfect vertical alignment:
      // Column 1 (Gross W, Stone W, BS) all start on the exact same line at col1X
      // Column 2 (Net W, CZ, Purity) all start on the exact same line at col2X
      const col1X = imgBoxX + 10;
      const col2X = imgBoxX + 92;
      const maxColW = 75;

      // Line 1: Gross W and Net W
      const line1Left = `Gross W ${item.grossWeight.toFixed(2)} g`;
      const line1Right = `Net W ${item.netWeight.toFixed(2)} g`;

      // Line 2: Stone W and CZ
      const hasStone = item.stoneWeight !== null && item.stoneWeight > 0;
      const hasCz = item.czWeight !== null && item.czWeight > 0;
      let line2Left: string | null = null;
      let line2Right: string | null = null;
      if (hasStone && hasCz) {
        line2Left = `Stone W ${formatWeight(item.stoneWeight!)}`;
        line2Right = `CZ ${formatWeight(item.czWeight!)}`;
      } else if (hasStone) {
        line2Left = `Stone W ${formatWeight(item.stoneWeight!)}`;
      } else if (hasCz) {
        line2Left = `CZ ${formatWeight(item.czWeight!)}`;
      }

      // Line 3: BS and Purity
      const hasBs = item.bsWeight !== null && item.bsWeight > 0;
      const hasPurity = Boolean(item.purityLabel);
      let line3Left: string | null = null;
      let line3Right: string | null = null;
      if (hasBs && hasPurity) {
        line3Left = `BS ${formatWeight(item.bsWeight!)}`;
        line3Right = `Purity ${item.purityLabel}`;
      } else if (hasBs) {
        line3Left = `BS ${formatWeight(item.bsWeight!)}`;
      } else if (hasPurity) {
        line3Left = `Purity ${item.purityLabel}`;
      }

      interface DualRow {
        left: string | null;
        right: string | null;
      }
      const rows: DualRow[] = [{ left: line1Left, right: line1Right }];
      if (line2Left || line2Right) {
        rows.push({ left: line2Left, right: line2Right });
      }
      if (line3Left || line3Right) {
        rows.push({ left: line3Left, right: line3Right });
      }

      const fontSize = 7.5;
      const lineSpacing = 11.5;
      let lineY = ruleY - 10;

      for (const row of rows) {
        if (row.left) {
          page.drawText(fitText(row.left, sansFont, fontSize, maxColW), {
            x: col1X,
            y: lineY,
            size: fontSize,
            font: sansFont,
            color: COLOR_MUTED,
          });
        }
        if (row.right) {
          page.drawText(fitText(row.right, sansFont, fontSize, maxColW), {
            x: col2X,
            y: lineY,
            size: fontSize,
            font: sansFont,
            color: COLOR_MUTED,
          });
        }
        lineY -= lineSpacing;
      }
    }
  }

  return pdfDoc.save();
}

