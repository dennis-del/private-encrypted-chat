import { NextResponse } from "next/server";
import { redis } from "../../../lib/redis";
import { randomUUID } from "crypto";

export async function GET() {
  const qrId = randomUUID();
  await redis.set(`qr:pending:${qrId}`, "1", "EX", 120); // Mark as pending
  console.log("GENERATED", qrId, "→ pending");
  return NextResponse.json({ qr: qrId });
}