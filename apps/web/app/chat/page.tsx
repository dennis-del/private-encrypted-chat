"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import QRCode from "react-qr-code";
import toast, { Toaster } from 'react-hot-toast';

let socket: Socket;

interface Message {
  senderId: string;
  receiverId: string;
  content: string;
  pending?: boolean;
  id: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasSentPending = useRef(false);

  // 1. Initialize Auth & Socket
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      // Fetch current user
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        setUserId(data.user._id);
        setUserName(data.user.name);
        localStorage.setItem("userId", data.user._id);
      } catch (err) {
        window.location.href = "/login";
        return;
      }

      // Fetch other users
      try {
        const res = await fetch("/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };

    init();
  }, []);

  // 2. Socket Connection
  useEffect(() => {
    if (!userId) return;

    if (!socket || !socket.connected) {
      socket = io("http://localhost:4001");
    }

    socket.emit("join", userId);

    const handleMessage = (msg: Message) => {
      const decryptedMessage = {
        ...msg,
        content: decryptMessage(msg.content),
      };

      setMessages((prev) => {
        const exists = prev.some(m => m.id === decryptedMessage.id);
        if (exists) return prev;
        return [...prev, decryptedMessage];
      });
    };

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsOnline(true);
      if (!hasSentPending.current) {
        sendPendingMessages(userId);
        hasSentPending.current = true;
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsOnline(false);
      hasSentPending.current = false;
    });

    socket.on("message", handleMessage);

    return () => {
      socket.off("message", handleMessage);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [userId]);

  // 3. Token Refresh
  useEffect(() => {
    const refreshToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("token", data.token);
          console.log("✅ Token refreshed");
        } else {
          console.error("Token refresh failed");
        }
      } catch (error) {
        console.error("Token refresh error:", error);
      }
    };

    refreshToken();
    const interval = setInterval(refreshToken, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingMessages = () => {
    const pending = localStorage.getItem("pendingMessages");
    if (pending) {
      const pendingMsgs = JSON.parse(pending);
      setMessages((prev) => {
        const newMessages = pendingMsgs.map((m: Message) => ({
          ...m,
          content: decryptMessage(m.content),
          pending: true
        }));

        const existingIds = new Set(prev.map(msg => msg.id));
        const uniqueNew = newMessages.filter((m: Message) => !existingIds.has(m.id));

        return [...prev, ...uniqueNew];
      });
    }
  };

  useEffect(() => {
    loadPendingMessages();
  }, []);

  const sendPendingMessages = (currentUserId: string) => {
    const pending = localStorage.getItem("pendingMessages");
    if (pending) {
      const pendingMsgs: Message[] = JSON.parse(pending);

      pendingMsgs.forEach((msg) => {
        socket.emit("send-message", msg);
      });

      localStorage.removeItem("pendingMessages");

      setMessages((prev) =>
        prev.map((m) => ({ ...m, pending: false }))
      );
    }
  };

  const sendMessage = () => {
    if (!text || !userId || !selectedUser) return;

    const encryptedContent = encryptMessage(text);
    const newMessage: Message = {
      senderId: userId,
      receiverId: selectedUser._id,
      content: encryptedContent,
      id: `${userId}-${Date.now()}-${Math.random()}`,
    };

    if (isOnline && socket.connected) {
      socket.emit("send-message", newMessage);
      setMessages((prev) => [
        ...prev,
        { ...newMessage, content: text, pending: false },
      ]);
    } else {
      const pending = localStorage.getItem("pendingMessages");
      const pendingMsgs = pending ? JSON.parse(pending) : [];
      pendingMsgs.push(newMessage);
      localStorage.setItem("pendingMessages", JSON.stringify(pendingMsgs));

      setMessages((prev) => [
        ...prev,
        { ...newMessage, content: text, pending: true },
      ]);
    }

    setText("");
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ token })
      });
    }
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  const generateQR = async () => {
    setShowQR(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/auth/qr/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.sessionId) {
        setQrSessionId(data.sessionId);
      }
    } catch (error) {
      console.error("QR Gen error", error);
    }
  };

  const exportBackup = () => {
    const backup = {
      messages: messages.map(m => ({
        ...m,
        content: encryptMessage(m.content)
      })),
      userId,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-backup-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success('Backup exported successfully!');
  };

  const importBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);

        const restoredMessages = backup.messages.map((m: Message) => ({
          ...m,
          content: decryptMessage(m.content),
          pending: false,
        }));

        setMessages(restoredMessages);
        toast.success(`Restored ${restoredMessages.length} messages!`);
      } catch (error) {
        toast.error('Error importing backup. Invalid file format.');
        console.error(error);
      }
    };

    reader.readAsText(file);
  };

  const currentChatMessages = messages.filter(
    (m) =>
      (m.senderId === userId && m.receiverId === selectedUser?._id) ||
      (m.senderId === selectedUser?._id && m.receiverId === userId)
  );

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
      <Toaster position="top-center" />
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static w-80 h-full bg-slate-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col z-40 transition-transform duration-300`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-xl text-white">{userName || 'Chat'}</h2>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/70 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 ${isOnline ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
            <span className="text-xs font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <button onClick={generateQR} className="w-full text-sm bg-green-500/20 text-green-300 px-4 py-2 rounded-xl hover:bg-green-500/30 transition-all border border-green-500/30 mb-2">
            📱 Link Mobile
          </button>

          <div className="flex gap-2 mb-2">
            <button
              onClick={exportBackup}
              className="flex-1 text-sm bg-purple-500/20 text-purple-300 px-3 py-2 rounded-xl hover:bg-purple-500/30 transition-all border border-purple-500/30"
            >
              📥 Export
            </button>
            <label className="flex-1 text-sm bg-blue-500/20 text-blue-300 px-3 py-2 rounded-xl hover:bg-blue-500/30 transition-all border border-blue-500/30 cursor-pointer text-center">
              📤 Import
              <input type="file" accept=".json" onChange={importBackup} className="hidden" />
            </label>
          </div>

          <button onClick={handleLogout} className="w-full text-sm text-red-400 hover:text-red-300 py-2 px-3 rounded-xl hover:bg-red-500/10 transition-all border border-red-500/20">
            Logout
          </button>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-3">
          {users.map(user => (
            <div
              key={user._id}
              onClick={() => {
                setSelectedUser(user);
                setSidebarOpen(false);
              }}
              className={`p-4 mb-2 cursor-pointer rounded-xl transition-all duration-200 ${
                selectedUser?._id === user._id 
                  ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 border border-white/20' 
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="font-semibold text-white">{user.name}</div>
              <div className="text-xs text-white/50">{user.email}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-slate-900/50 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/70 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <div className="font-bold text-white">{selectedUser.name}</div>
                  <div className="text-xs text-white/50">{selectedUser.email}</div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {currentChatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.senderId === userId ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-md px-4 py-3 rounded-2xl ${
                    m.senderId === userId
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-br-sm'
                      : 'bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-bl-sm'
                  }`}>
                    <div className="text-sm">{m.content}</div>
                    {m.pending && <span className="text-xs opacity-75">⏳ Pending</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-slate-900/50 backdrop-blur-xl border-t border-white/10">
              <div className="flex gap-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Type a message..."
                />
                <button
                  onClick={sendMessage}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/50">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden mb-4 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
              Open Contacts
            </button>
            <p className="text-lg">Select a user to start chatting</p>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl flex flex-col items-center gap-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white">Scan to Login on Mobile</h3>
            {qrSessionId ? (
              <div className="p-4 bg-white rounded-2xl">
                <QRCode value={JSON.stringify({ sessionId: qrSessionId })} size={220} />
              </div>
            ) : (
              <p className="text-white/70">Generating QR...</p>
            )}
            <p className="text-sm text-white/70 text-center">Open the mobile app and scan this code</p>
            <button
              onClick={() => setShowQR(false)}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"></div>
      )}
    </div>
  );
}