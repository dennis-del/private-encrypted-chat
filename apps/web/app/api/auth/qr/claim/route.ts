import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { signToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { User } from '../../user.model';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { sessionId } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
        }

        // Check Redis for the session
        const sessionData = await redis.get(`qr:${sessionId}`);
        if (!sessionData) {
            return NextResponse.json({ error: 'Invalid or expired QR code' }, { status: 400 });
        }

        const { userId } = JSON.parse(sessionData);
        if (!userId) {
            return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
        }

        // Fetch user to get details
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate new session token for mobile
        const token = signToken({ userId: user._id, email: user.email, role: user.role });

        // Store session in Redis (7 days)
        await redis.set(`session:${user._id}:${token}`, 'valid', 'EX', 604800);

        // Mark QR as claimed (optional, or just let it expire)
        await redis.del(`qr:${sessionId}`);

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('QR Claim error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
