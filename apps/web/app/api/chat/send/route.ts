import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Message } from '../message.model';
import { verifyToken } from '@/lib/auth';
import redis from '@/lib/redis';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const token = req.headers.get('Authorization')?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || typeof decoded === 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { receiverId, content } = await req.json();

    if (!receiverId || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Content is ALREADY ENCRYPTED by the client
    const message = await Message.create({
      senderId: decoded.userId,
      receiverId,
      content,
    });

    // Publish to Redis for Socket.io / SSE
    // We'll use a simple channel pattern: `chat:${userId}`
    await redis.publish(`chat:${receiverId}`, JSON.stringify(message));
    // Also publish to sender's other devices
    await redis.publish(`chat:${decoded.userId}`, JSON.stringify(message));

    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Chat Send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
