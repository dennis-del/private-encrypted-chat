import { NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { qr, userId } = await req.json();

    const exists = await redis.get(`qr:pending:${qr}`);
    if (!exists) {
      return NextResponse.json({ error: "QR expired" }, { status: 400 });
    }

    // Remove MongoDB query - just create token with userId
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    // Delete pending key and set token key
    await redis.del(`qr:pending:${qr}`);
    await redis.set(`qr:token:${qr}`, token, "EX", 120);
    
    console.log("SCAN called", qr, userId);

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error("Error in scan endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}