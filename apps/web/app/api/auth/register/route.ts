import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '../user.model';
import { hashPassword, generateKeyPair, encryptPrivateKey, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Generate E2EE KeyPair
    const { publicKey, privateKey } = await generateKeyPair();

    // Encrypt Private Key with User's Password
    const encryptedPrivateKey = await encryptPrivateKey(privateKey, password);

    // Hash Password for Auth
    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      encryptedPrivateKey,
      publicKey
    });

    // Create Session Token
    const token = signToken({ userId: user._id, email: user.email, role: user.role });

    const response = NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
      encryptedPrivateKey, // Send back so client can decrypt and store in memory
      publicKey // Send back public key too
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
