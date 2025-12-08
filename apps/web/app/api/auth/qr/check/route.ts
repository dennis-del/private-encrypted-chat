import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

export async function GET(req: NextRequest) {
  const qr = req.nextUrl.searchParams.get("qr");
  if (!qr) return NextResponse.json({ token: null });

  const token = await redis.get(`qr:token:${qr}`);
  console.log("CHECK", qr, "→", token ? "token found" : "not scanned yet");
  return NextResponse.json({ token });
}