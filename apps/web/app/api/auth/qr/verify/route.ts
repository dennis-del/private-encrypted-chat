import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import dbConnect from '@/lib/db';
import { User } from '../../user.model';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { sessionId, userId, encryptedPrivateKey } = await req.json();

        if (!sessionId || !userId || !encryptedPrivateKey) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const sessionKey = `qr:${sessionId}`;
        const sessionData = await redis.get(sessionKey);

        if (!sessionData) {
            return NextResponse.json({ error: 'Session expired or invalid' }, { status: 404 });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Update session in Redis
        // We store the encryptedPrivateKey temporarily so the Web client can pick it up.
        // This key is encrypted with a session-specific key (or just passed through if we trust the channel).
        // In our plan, we said Mobile encrypts it with a key derived from QR or just passes it.
        // For simplicity here, we assume Mobile sends the *User's Password-Encrypted Private Key* (decrypted then re-encrypted? No).
        // Wait, Mobile has the DECRYPTED private key.
        // Web needs the DECRYPTED private key to work? No, Web usually stores the Encrypted Private Key and asks user for password.
        // BUT QR login is "no password typing".
        // So Mobile must send the DECRYPTED private key to Web.
        // To do this safely, it should be encrypted with a key that only Web knows.
        // Web can generate a temporary key pair for this session?
        // Or simpler: Mobile encrypts it with the `sessionId` (which is a random UUID acting as a shared secret if displayed in QR).
        // Let's assume `encryptedPrivateKey` passed here is encrypted with `sessionId`.

        await redis.set(sessionKey, JSON.stringify({
            status: 'authenticated',
            userId,
            encryptedPrivateKey // This is the key encrypted with sessionId
        }), 'EX', 60); // Give web 60s to pick it up

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('QR Verify error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
