import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const token = req.headers.get("Authorization")?.split(" ")[1];
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded || typeof decoded === "string") {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const sessionId = uuidv4();
        // Store session in Redis with 2 min expiry
        // Status: pending, userId: current user
        await redis.set(`qr:${sessionId}`, JSON.stringify({ status: 'pending', userId: decoded.userId }), 'EX', 120);

        return NextResponse.json({ sessionId });
    } catch (error) {
        console.error('QR Generate error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
