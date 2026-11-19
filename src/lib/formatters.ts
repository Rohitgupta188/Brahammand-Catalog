export function formatDesignNumber(designNumber: string): string {
  return (designNumber ?? "").trim().replace(/-c$/i, "");
}

export function formatPurity(metalPurity?: string | null): string {
  const raw = (metalPurity ?? "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/\s*(kt|k)$/i, "").trim();
  return cleaned ? `${cleaned} kt` : "";
}

export function formatCollection(collectionLine?: string | null): string {
  return (collectionLine ?? "").trim();
}

export function parseWeightValue(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    return Number.isFinite(val) && val > 0 ? Number(val.toFixed(3)) : null;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) && num > 0 ? Number(num.toFixed(3)) : null;
  }
  return null;
}

export function formatWeight(val: number): string {
  const formatted3 = val.toFixed(3);
  if (formatted3.endsWith("0")) {
    return `${val.toFixed(2)} g`;
  }
  return `${formatted3} g`;
}


