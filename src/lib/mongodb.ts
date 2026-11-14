import { MongoClient, ObjectId, type Collection, type Db } from "mongodb";

export interface CatalogDocument {
  _id: ObjectId;
  sku?: string;
  designNumber: string;
  itemType?: string;
  collectionLine?: string;
  grossWeight?: number;
  netWeight?: number;
  stoneWeight?: number | string | null;
  reserved1?: unknown;
  reserved3?: unknown;
  metalPurity?: string;
  metalType?: string;
  itemStatus?: string;
  isCatalog?: boolean;
  deleted?: boolean;
  imageName?: string;
  imageUrl?: string | null;
  storagePath?: string | null;
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not configured.");
  }

  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    globalThis._mongoClientPromise = client.connect();
  }

  return globalThis._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}

export async function getCatalogsCollection(): Promise<Collection<CatalogDocument>> {
  const db = await getDb();
  return db.collection<CatalogDocument>("catalogs");
}
