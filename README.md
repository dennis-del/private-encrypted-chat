# Private Encrypted Chat - Web + Mobile

A full-stack encrypted chat application with web and mobile support, featuring QR code authentication, end-to-end encryption, and real-time messaging.

## 🚀 Features

- **User Authentication** - Register and login on web app
- **QR Code Login** - Scan QR from web to login on mobile
- **End-to-End Encryption** - Messages encrypted on client-side
- **Real-time Messaging** - Instant message sync across devices
- **Offline Support** - Messages queue and sync when back online
- **Backup & Restore** - Export/import chat history
- **Auto Token Refresh** - Sessions refresh every 15 minutes

## 🛠️ Tech Stack

### Web App
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Socket.io Client** - Real-time messaging
- **React Hot Toast** - Notifications

### Mobile App
- **React Native (Expo)** - Mobile framework
- **TypeScript** - Type safety
- **Expo Camera** - QR code scanning
- **Socket.io Client** - Real-time messaging
- **React Native Toast** - Notifications

### Backend
- **Node.js** - Runtime
- **Socket.io** - WebSocket server
- **MongoDB** - User data & encrypted messages
- **Redis** - Session management & QR tokens
- **JWT** - Authentication tokens

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB running (local or cloud)
- Redis running (local or cloud)
- Expo CLI installed: `npm install -g expo-cli`

## 🏃 Running the Web App

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd private-chat
```

2. **Install dependencies**
```bash
cd web
npm install
```

3. **Set up environment variables**
Create `.env.local` in the web folder:
```env
MONGODB_URI=mongodb+srv://dennisjames2001:dennisdj123@cluster0.qrqe7mx.mongodb.net/chatapp?retryWrites=true&w=majority&appName=Cluster0
REDIS_URL=rediss://default:Aa2FAAIncDI1ZmY4YzNjZTE3MGM0OTNkOTdiZWYyYWQzYjAyNmZkYXAyNDQ0MjE@saved-toucan-44421.upstash.io:6379
JWT_SECRET=2026
REDIS_USE_TLS=true
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open in browser**
```
http://localhost:3000
```

## 📱 Running the Mobile App

1. **Navigate to mobile folder**
```bash
cd mobile
npm install
```

2. **Set up environment variables**
Create `.env` in the mobile folder:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.5:3000
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.5:4001
```
*Note: Replace `192.168.1.5` with your local IP address*

3. **Start Expo**
```bash
npx expo start
```

4. **Run on device**
- Install **Expo Go** app on your phone
- Scan the QR code shown in terminal
- Or press `a` for Android emulator / `i` for iOS simulator

## 🔧 Running the Socket Server

1. **Navigate to server folder**
```bash
cd server
npm install
```

2. **Start the server**
```bash
npm start
```

## 📖 How to Use

### 1. Register & Login on Web
1. Open `http://localhost:3000`
2. Click **"Create Account"**
3. Fill in name, email, and password
4. Click **"Register"**
5. You'll be redirected to login page
6. Login with your credentials
7. You'll see the chat interface

### 2. Login on Mobile via QR Code
1. On web app, click **"📱 Link Mobile"** button in sidebar
2. A QR code will appear
3. Open the mobile app
4. Point camera at the QR code
5. Scan to login instantly (no password needed)
6. QR code expires after 5 minutes and is single-use

### 3. Send & Receive Messages
1. Select a user from the contacts list
2. Type your message in the input box
3. Press **Send** or hit Enter
4. Message appears on both web and mobile instantly
5. Messages are end-to-end encrypted

### 4. Offline → Online Sync
1. Turn off WiFi/data on one device
2. Send messages - they'll show as **"⏳ Pending"**
3. Turn WiFi/data back on
4. Pending messages automatically sync and send

### 5. Backup & Restore
**Export Backup:**
1. Click **"📥 Export"** button
2. JSON file downloads with all encrypted messages
3. Save this file securely

**Import Backup:**
1. Click **"📤 Import"** button
2. Select your backup JSON file
3. All messages restore in correct order

## 🔐 Security & Privacy

### End-to-End Encryption
- Messages encrypted on client-side before sending
- Uses AES-256-CBC encryption
- Server only stores encrypted content
- Decryption only happens on user devices
- Encryption key stored locally on each device

### Session Management
- JWT tokens used for authentication
- Tokens automatically refresh every 15 minutes
- Redis stores active sessions with TTL
- Tokens expire and become invalid after logout

### QR Code Security
- QR contains temporary session ID (not credentials)
- Session ID stored in Redis with 5-minute expiry
- Single-use: QR becomes invalid after one scan
- Server validates and invalidates immediately

## 🤖 AI Usage

This project was built using **AI-first development** with:

### Tools Used
- **Antigravity IDE** - AI-powered code generation and refactoring
- **Claude (Anthropic)** - Component design and architecture guidance
- **Windsurf** - Code completion and suggestions
- **Chatgpt** - Code generation

### How AI Was Used
1. **Boilerplate Generation** - Auth flow, API routes, Socket.io setup
2. **UI/UX Design** - Modern glassmorphism design system
3. **Component Building** - React components for web and mobile
4. **Code Refactoring** - Optimizing code structure and performance
5. **Bug Fixing** - Debugging encryption, socket connections
6. **Documentation** - README and inline code comments

AI significantly accelerated development, allowing focus on architecture and user experience rather than repetitive coding tasks.

## 📁 Project Structure
```
private-chat/
├── web/                    # Next.js web application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities (crypto, etc)
│   └── public/           # Static assets
├── mobile/                # React Native mobile app
│   ├── app/              # Expo router pages
│   ├── components/       # Mobile components
│   └── lib/             # Utilities (crypto, etc)
├── server/               # Socket.io server
│   ├── index.js         # Main server file
│   └── package.json
└── README.md
```

## 🎥 Video Walkthrough

📹 **[Watch Demo Video](https://drive.google.com/file/d/1sxL2oT8DcBsz_Gm0ke-JW9trQux5fTw8/view?usp=drivesdk)**

The video demonstrates:
- User registration and login
- QR code mobile authentication
- Real-time messaging between web and mobile
- Offline sync behavior
- Backup export and import
- Security features explanation

## 🐛 Troubleshooting

**Web app won't start:**
- Check MongoDB is running: `mongod`
- Check Redis is running: `redis-server`
- Verify `.env.local` has correct values

**Mobile app can't connect:**
- Update API URL in `.env` with your computer's IP
- Ensure web app and socket server are running
- Check firewall allows connections on ports 3000 and 4001

**Messages not syncing:**
- Verify socket server is running on port 4001
- Check browser console for errors
- Ensure both devices are on same network

**QR code won't scan:**
- Check camera permissions in mobile app
- Ensure QR code is clearly visible
- Try regenerating QR code (may have expired)

**Note:** This is a demonstration project. For production use, implement additional security measures like key rotation, secure key storage, and proper error handling.