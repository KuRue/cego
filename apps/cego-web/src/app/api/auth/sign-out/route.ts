import { NextResponse } from "next/server";
import { getPublicUrl } from "@/lib/public-url";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.redirect(getPublicUrl("/"));
  response.cookies.set({
    name: "cego_session",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
