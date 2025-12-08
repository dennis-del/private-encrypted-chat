import { NextResponse } from 'next/server';
import redis from '@/lib/redis';
import dbConnect from '@/lib/db';
import { User } from '../../user.model';
import { signToken } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
        }

        const sessionKey = `qr:${sessionId}`;
        const sessionDataStr = await redis.get(sessionKey);

        if (!sessionDataStr) {
            return NextResponse.json({ status: 'expired' });
        }

        const sessionData = JSON.parse(sessionDataStr);

        if (sessionData.status === 'pending') {
            return NextResponse.json({ status: 'pending' });
        }

        if (sessionData.status === 'authenticated') {
            await dbConnect();
            const user = await User.findById(sessionData.userId);

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Generate Session Token
            const token = signToken({ userId: user._id, email: user.email, role: user.role });

            const response = NextResponse.json({
                status: 'authenticated',
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role,
                },
                token,
                encryptedPrivateKey: sessionData.encryptedPrivateKey // Encrypted with sessionId
            });

            response.cookies.set('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 15 * 60, // 15 minutes
                path: '/',
            });

            // Delete session after successful login
            await redis.del(sessionKey);

            return response;
        }

        return NextResponse.json({ status: 'unknown' });

    } catch (error) {
        console.error('QR Poll error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
