import { NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/maps";

// POST /api/geocode  { address } -> { latitude, longitude, formattedAddress }
export async function POST(req: Request) {
  const { address } = await req.json().catch(() => ({ address: "" }));
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "Address required." }, { status: 400 });
  }
  const result = await geocodeAddress(address);
  if (!result) {
    return NextResponse.json({ error: "Could not geocode that address." }, { status: 422 });
  }
  return NextResponse.json(result);
}
