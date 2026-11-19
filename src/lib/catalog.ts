import { cacheLife } from "next/cache";
import { ObjectId, type Filter } from "mongodb";
import { getCatalogsCollection, type CatalogDocument } from "@/lib/mongodb";
import {
  MAX_PDF_PRODUCTS,
  DEFAULT_PAGE_SIZE,
  OTHER_COLLECTION_VALUE,
  type CatalogFilters,
  type CatalogProductItem,
  type CategoryOption,
  type FilterOptionsPayload,
  type ProductsResponse,
} from "@/lib/types";
import {
  formatDesignNumber,
  formatPurity,
  formatCollection,
  parseWeightValue,
  formatWeight,
} from "@/lib/formatters";
import { ikUrl } from "@/lib/ikUrl";

export {
  MAX_PDF_PRODUCTS,
  DEFAULT_PAGE_SIZE,
  OTHER_COLLECTION_VALUE,
  type CatalogFilters,
  type CatalogProductItem,
  type CategoryOption,
  type FilterOptionsPayload,
  type ProductsResponse,
  formatDesignNumber,
  formatPurity,
  formatCollection,
  parseWeightValue,
  formatWeight,
};

export const BASE_CATALOGUE_FILTER: Filter<CatalogDocument> = {
  itemStatus: "CATALOGUE",
  deleted: { $ne: true },
};

export function serializeCatalogDoc(doc: CatalogDocument): CatalogProductItem {
  const imageUrl = doc.imageUrl ? doc.imageUrl.trim() : null;
  const czWeight = parseWeightValue(doc.reserved1);
  const bsWeight = parseWeightValue(doc.reserved3);
  const stoneWeight = parseWeightValue(doc.stoneWeight);

  return {
    id: String(doc._id),
    designNumber: doc.designNumber ?? "",
    displayDesignNumber: formatDesignNumber(doc.designNumber ?? ""),
    category: (doc.itemType ?? "").trim(),
    collection: formatCollection(doc.collectionLine),
    grossWeight: Number((doc.grossWeight ?? 0).toFixed(2)),
    netWeight: Number((doc.netWeight ?? 0).toFixed(2)),
    czWeight,
    bsWeight,
    stoneWeight,
    purityLabel: formatPurity(doc.metalPurity),
    imageName: doc.imageName ?? null,
    imageUrl,
    thumbUrl: ikUrl(imageUrl),
    printUrl: ikUrl(imageUrl),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildCatalogQuery(
  filters: CatalogFilters
): Filter<CatalogDocument> {
  const conditions: Filter<CatalogDocument>[] = [BASE_CATALOGUE_FILTER];

  if (filters.category && filters.category.trim()) {
    conditions.push({ itemType: filters.category.trim() });
  }

  if (filters.collections && filters.collections.length > 0) {
    const includeOther = filters.collections.includes(OTHER_COLLECTION_VALUE);
    const named = filters.collections.filter(
      (c) => c !== OTHER_COLLECTION_VALUE && c.trim().length > 0
    );

    const collectionClauses: Filter<CatalogDocument>[] = [];
    if (named.length > 0) {
      collectionClauses.push({ collectionLine: { $in: named } });
    }
    if (includeOther) {
      collectionClauses.push({ collectionLine: "" });
      collectionClauses.push({ collectionLine: null as unknown as string });
      collectionClauses.push({
        collectionLine: { $exists: false },
      } as Filter<CatalogDocument>);
    }

    if (collectionClauses.length === 1) {
      conditions.push(collectionClauses[0]);
    } else if (collectionClauses.length > 1) {
      conditions.push({ $or: collectionClauses });
    }
  }

  const weightFilter: Record<string, number> = {};
  if (
    typeof filters.minWeight === "number" &&
    Number.isFinite(filters.minWeight)
  ) {
    weightFilter.$gte = filters.minWeight;
  }
  if (
    typeof filters.maxWeight === "number" &&
    Number.isFinite(filters.maxWeight)
  ) {
    weightFilter.$lte = filters.maxWeight;
  }
  if (Object.keys(weightFilter).length > 0) {
    conditions.push({ grossWeight: weightFilter });
  }

  if (filters.search && filters.search.trim()) {
    const pattern = escapeRegex(filters.search.trim());
    conditions.push({
      designNumber: { $regex: pattern, $options: "i" },
    });
  }

  if (filters.hasImage === true) {
    conditions.push({
      imageUrl: { $exists: true, $nin: [null, ""] },
    });
  }

  return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

export async function getFilterOptions(): Promise<FilterOptionsPayload> {
  "use cache";
  cacheLife("minutes");

  const col = await getCatalogsCollection();

  const [totalsResult, categoryAgg, globalCollectionsAgg] = await Promise.all([
    col
      .aggregate<{
        totalCatalogue: number;
        withPhotoCount: number;
        minWeight: number;
        maxWeight: number;
      }>([
        { $match: BASE_CATALOGUE_FILTER },
        {
          $group: {
            _id: null,
            totalCatalogue: { $sum: 1 },
            withPhotoCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$imageUrl", null] },
                      { $ne: [{ $ifNull: ["$imageUrl", ""] }, ""] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            minWeight: { $min: "$grossWeight" },
            maxWeight: { $max: "$grossWeight" },
          },
        },
      ])
      .toArray(),
    col
      .aggregate<{
        _id: { category: string; collection: string };
        count: number;
        minWeight: number;
        maxWeight: number;
      }>([
        { $match: BASE_CATALOGUE_FILTER },
        {
          $group: {
            _id: {
              category: { $ifNull: ["$itemType", ""] },
              collection: { $ifNull: ["$collectionLine", ""] },
            },
            count: { $sum: 1 },
            minWeight: { $min: "$grossWeight" },
            maxWeight: { $max: "$grossWeight" },
          },
        },
      ])
      .toArray(),
    col
      .aggregate<{ _id: string; count: number }>([
        { $match: BASE_CATALOGUE_FILTER },
        {
          $group: {
            _id: { $ifNull: ["$collectionLine", ""] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
      ])
      .toArray(),
  ]);

  const totals = totalsResult[0] ?? {
    totalCatalogue: 0,
    withPhotoCount: 0,
    minWeight: 0,
    maxWeight: 0,
  };

  const categoryMap = new Map<
    string,
    {
      count: number;
      minWeight: number;
      maxWeight: number;
      collections: Map<string, number>;
    }
  >();

  for (const row of categoryAgg) {
    const categoryName = (row._id.category || "Uncategorized").trim();
    const collectionName = (row._id.collection || "").trim();
    const entry = categoryMap.get(categoryName) ?? {
      count: 0,
      minWeight: Number.POSITIVE_INFINITY,
      maxWeight: Number.NEGATIVE_INFINITY,
      collections: new Map<string, number>(),
    };
    entry.count += row.count;
    if (typeof row.minWeight === "number") {
      entry.minWeight = Math.min(entry.minWeight, row.minWeight);
    }
    if (typeof row.maxWeight === "number") {
      entry.maxWeight = Math.max(entry.maxWeight, row.maxWeight);
    }
    const collKey = collectionName || OTHER_COLLECTION_VALUE;
    entry.collections.set(
      collKey,
      (entry.collections.get(collKey) ?? 0) + row.count
    );
    categoryMap.set(categoryName, entry);
  }

  const mapCollectionList = (map: Map<string, number>) =>
    [...map.entries()]
      .map(([value, count]) => ({
        value,
        label: value === OTHER_COLLECTION_VALUE ? "Other" : value,
        count,
      }))
      .sort((a, b) => {
        if (a.value === OTHER_COLLECTION_VALUE) return 1;
        if (b.value === OTHER_COLLECTION_VALUE) return -1;
        return b.count - a.count || a.label.localeCompare(b.label);
      });

  const categories: CategoryOption[] = [...categoryMap.entries()]
    .map(([name, info]) => ({
      name,
      count: info.count,
      collections: mapCollectionList(info.collections),
      minWeight: Number.isFinite(info.minWeight)
        ? Number(info.minWeight.toFixed(2))
        : 0,
      maxWeight: Number.isFinite(info.maxWeight)
        ? Number(info.maxWeight.toFixed(2))
        : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const globalMap = new Map<string, number>();
  for (const row of globalCollectionsAgg) {
    const key = (row._id || "").trim() || OTHER_COLLECTION_VALUE;
    globalMap.set(key, (globalMap.get(key) ?? 0) + row.count);
  }

  return {
    totalCatalogue: totals.totalCatalogue,
    withPhotoCount: totals.withPhotoCount,
    missingPhotoCount: Math.max(0, totals.totalCatalogue - totals.withPhotoCount),
    categories,
    allCollections: mapCollectionList(globalMap),
    minWeight: Number((totals.minWeight ?? 0).toFixed(2)),
    maxWeight: Number((totals.maxWeight ?? 0).toFixed(2)),
  };
}

export async function queryCatalogProducts(
  filters: CatalogFilters,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<{
  items: CatalogProductItem[];
  total: number;
  totalWithPhotos: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const col = await getCatalogsCollection();
  const query = buildCatalogQuery(filters);
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const skip = (safePage - 1) * safeSize;

  const withPhotoQuery: Filter<CatalogDocument> = {
    $and: [query, { imageUrl: { $exists: true, $nin: [null, ""] } }],
  };

  const [docs, total, totalWithPhotosRaw] = await Promise.all([
    col
      .find(query, {
        projection: {
          designNumber: 1,
          itemType: 1,
          collectionLine: 1,
          grossWeight: 1,
          netWeight: 1,
          stoneWeight: 1,
          reserved1: 1,
          reserved3: 1,
          metalPurity: 1,
          imageName: 1,
          imageUrl: 1,
        },
      })
      .sort({ designNumber: 1, _id: 1 })
      .skip(skip)
      .limit(safeSize)
      .toArray(),
    col.countDocuments(query),
    filters.hasImage === true ? 0 : col.countDocuments(withPhotoQuery),
  ]);

  const totalWithPhotos =
    filters.hasImage === true ? total : totalWithPhotosRaw;

  return {
    items: docs.map(serializeCatalogDoc),
    total,
    totalWithPhotos,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
}

function toObjectIds(ids: string[]): ObjectId[] {
  const parsed: ObjectId[] = [];
  for (const id of ids) {
    if (ObjectId.isValid(id)) {
      parsed.push(new ObjectId(id));
    }
  }
  return parsed;
}

export async function resolveProductsForPdf(params: {
  filters: CatalogFilters;
  selectionMode: "all" | "custom";
  selectedIds?: string[];
  excludedIds?: string[];
  includedNoPhotoIds?: string[];
}): Promise<{ items: CatalogProductItem[]; totalSelected: number }> {
  const col = await getCatalogsCollection();
  const baseQuery = buildCatalogQuery(params.filters);

  let finalQuery: Filter<CatalogDocument> = baseQuery;
  if (params.selectionMode === "custom") {
    const objectIds = toObjectIds(params.selectedIds ?? []);
    if (objectIds.length === 0) {
      return { items: [], totalSelected: 0 };
    }
    finalQuery = {
      $and: [baseQuery, { _id: { $in: objectIds } }],
    };
  } else {
    // selectionMode === "all"
    const andClauses: Filter<CatalogDocument>[] = [baseQuery];

    // If filters.hasImage was not explicitly true, default to selecting products with images,
    // plus any no-photo products that the user explicitly selected (includedNoPhotoIds).
    if (params.filters.hasImage !== true) {
      const photoFilter: Filter<CatalogDocument> = {
        imageUrl: { $exists: true, $nin: [null, ""] },
      };
      if (params.includedNoPhotoIds && params.includedNoPhotoIds.length > 0) {
        const includedObjIds = toObjectIds(params.includedNoPhotoIds);
        if (includedObjIds.length > 0) {
          andClauses.push({
            $or: [photoFilter, { _id: { $in: includedObjIds } }],
          });
        } else {
          andClauses.push(photoFilter);
        }
      } else {
        andClauses.push(photoFilter);
      }
    }

    if (params.excludedIds && params.excludedIds.length > 0) {
      const objectIds = toObjectIds(params.excludedIds);
      if (objectIds.length > 0) {
        andClauses.push({ _id: { $nin: objectIds } });
      }
    }

    finalQuery = andClauses.length === 1 ? andClauses[0] : { $and: andClauses };
  }

  const totalSelected = await col.countDocuments(finalQuery);
  if (totalSelected === 0 || totalSelected > MAX_PDF_PRODUCTS) {
    return { items: [], totalSelected };
  }

  const docs = await col
    .find(finalQuery, {
      projection: {
        designNumber: 1,
        itemType: 1,
        collectionLine: 1,
        grossWeight: 1,
        netWeight: 1,
        stoneWeight: 1,
        reserved1: 1,
        reserved3: 1,
        metalPurity: 1,
        imageName: 1,
        imageUrl: 1,
      },
    })
    .sort({ designNumber: 1, _id: 1 })
    .limit(MAX_PDF_PRODUCTS)
    .toArray();

  return {
    items: docs.map(serializeCatalogDoc),
    totalSelected,
  };
}

export async function queryMissingPhotos(params: {
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  totalMissing: number;
  byCategory: { category: string; count: number }[];
  items: CatalogProductItem[];
  page: number;
  totalPages: number;
}> {
  const col = await getCatalogsCollection();
  const missingCondition: Filter<CatalogDocument> = {
    $and: [
      BASE_CATALOGUE_FILTER,
      {
        $or: [
          { imageUrl: null },
          { imageUrl: { $exists: false } },
          { imageUrl: "" },
        ],
      },
    ],
  };

  const listQuery: Filter<CatalogDocument> =
    params.category && params.category.trim()
      ? { $and: [missingCondition, { itemType: params.category.trim() }] }
      : missingCondition;

  const safePage = Math.max(1, Math.floor(params.page ?? 1));
  const safeSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 60)));

  const [byCategoryAgg, filteredTotal, docs] = await Promise.all([
    col
      .aggregate<{ _id: string; count: number }>([
        { $match: missingCondition },
        {
          $group: {
            _id: { $ifNull: ["$itemType", "Uncategorized"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
      ])
      .toArray(),
    col.countDocuments(listQuery),
    col
      .find(listQuery, {
        projection: {
          designNumber: 1,
          itemType: 1,
          collectionLine: 1,
          grossWeight: 1,
          netWeight: 1,
          metalPurity: 1,
          imageName: 1,
          imageUrl: 1,
        },
      })
      .sort({ itemType: 1, designNumber: 1 })
      .skip((safePage - 1) * safeSize)
      .limit(safeSize)
      .toArray(),
  ]);

  return {
    totalMissing: byCategoryAgg.reduce((acc, r) => acc + r.count, 0),
    byCategory: byCategoryAgg.map((r) => ({
      category: r._id || "Uncategorized",
      count: r.count,
    })),
    items: docs.map(serializeCatalogDoc),
    page: safePage,
    totalPages: Math.max(1, Math.ceil(filteredTotal / safeSize)),
  };
}

