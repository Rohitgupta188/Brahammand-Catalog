import { NextRequest, NextResponse } from "next/server";
import { queryMissingPhotos } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  try {
    const category = params.get("category") || undefined;
    const page = Math.max(1, Number(params.get("page") || "1") || 1);
    const pageSize = Math.min(
      200,
      Math.max(1, Number(params.get("pageSize") || "60") || 60)
    );

    const data = await queryMissingPhotos({ category, page, pageSize });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to query missing photos:", error);
    return NextResponse.json(
      { error: "Failed to load missing photos report" },
      { status: 500 }
    );
  }
}
