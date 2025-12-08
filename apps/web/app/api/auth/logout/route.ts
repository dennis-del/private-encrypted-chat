import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: "No token provided" }, { status: 400 });
        }

        // Decode to get userId (don't verify, just decode)
        const decoded = jwt.decode(token) as { userId: string };
        if (decoded && decoded.userId) {
            await redis.del(`session:${decoded.userId}:${token}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
