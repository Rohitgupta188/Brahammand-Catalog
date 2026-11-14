import { NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/catalog";

export async function GET() {
  try {
    const data = await getFilterOptions();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch filter options:", error);
    return NextResponse.json(
      { error: "Failed to load catalog filters" },
      { status: 500 }
    );
  }
}

