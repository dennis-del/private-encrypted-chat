import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    // Verify the old token
    // We use ignoreExpiration: true to allow refreshing slightly expired tokens
    // as long as the session is still valid in Redis.
    // However, if Redis key is expired, it will fail anyway.
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        decoded = jwt.decode(token) as { userId: string };
      } else {
        throw err;
      }
    }

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check if token exists in Redis
    const sessionKey = `session:${decoded.userId}:${token}`;
    const isValid = await redis.get(sessionKey);

    if (!isValid) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    // Generate new token with fresh expiration (7d)
    const newToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // Rotate tokens in Redis
    // We delete the old key and create a new one
    await redis.del(sessionKey);
    await redis.set(`session:${decoded.userId}:${newToken}`, 'valid', 'EX', 604800);

    console.log("Token refreshed for user:", decoded.userId);

    return NextResponse.json({ token: newToken });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}