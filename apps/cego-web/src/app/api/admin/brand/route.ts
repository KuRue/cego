import { NextResponse } from "next/server";
import { getNavbarBrand } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  const brand = await getNavbarBrand();
  return NextResponse.json(brand);
}
