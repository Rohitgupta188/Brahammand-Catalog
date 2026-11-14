export const MAX_PDF_PRODUCTS = 2000;
export const DEFAULT_PAGE_SIZE = 60;
export const OTHER_COLLECTION_VALUE = "__OTHER__";

export interface CatalogFilters {
  category?: string;
  collections?: string[];
  minWeight?: number;
  maxWeight?: number;
  search?: string;
  hasImage?: boolean;
}

export interface CatalogProductItem {
  id: string;
  designNumber: string;
  displayDesignNumber: string;
  category: string;
  collection: string;
  grossWeight: number;
  netWeight: number;
  czWeight: number | null;
  bsWeight: number | null;
  stoneWeight: number | null;
  purityLabel: string;
  imageName: string | null;
  imageUrl: string | null;
  thumbUrl: string | null;
  printUrl: string | null;
}

export interface CategoryOption {
  name: string;
  count: number;
  collections: { value: string; label: string; count: number }[];
  minWeight: number;
  maxWeight: number;
}

export interface FilterOptionsPayload {
  totalCatalogue: number;
  withPhotoCount: number;
  missingPhotoCount: number;
  categories: CategoryOption[];
  allCollections: { value: string; label: string; count: number }[];
  minWeight: number;
  maxWeight: number;
}

export interface ProductsResponse {
  items: CatalogProductItem[];
  total: number;
  totalWithPhotos: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

