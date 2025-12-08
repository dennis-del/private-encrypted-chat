import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Message } from '../message.model';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get('userId');

    let query: any = {
      $or: [
        { senderId: decoded.userId },
        { receiverId: decoded.userId }
      ]
    };

    if (otherUserId) {
      query = {
        $or: [
          { senderId: decoded.userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: decoded.userId }
        ]
      };
    }

    const messages = await Message.find(query).sort({ createdAt: 1 });

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Chat List error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
