export interface User {
  _id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string; // Encrypted content
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  encryptedPrivateKey: string; // Encrypted with user's password
}

export interface QRSession {
  sessionId: string;
  status: 'pending' | 'scanned' | 'authenticated' | 'expired';
  encryptedPrivateKey?: string; // Sent by mobile, encrypted with session key
  userId?: string;
}

export interface SocketEvents {
  'chat:send': (message: { receiverId: string; content: string }) => void;
  'chat:receive': (message: Message) => void;
  'qr:scan': (data: { sessionId: string; encryptedPrivateKey: string; userId: string }) => void;
  'qr:success': (data: { token: string; user: User; encryptedPrivateKey: string }) => void;
}
