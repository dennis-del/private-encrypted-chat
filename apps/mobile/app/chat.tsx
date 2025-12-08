import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, FlatList } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from "socket.io-client";
import { encryptMessage, decryptMessage } from "../lib/crypto";
import NetInfo from '@react-native-community/netinfo';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import Toast from 'react-native-toast-message';

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
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const hasSentPending = useRef(false);

  useEffect(() => {
    checkAuthAndLoad();
    const unsubscribe = setupNetworkListener();
    return () => unsubscribe && unsubscribe();
  }, []);

  const checkAuthAndLoad = async () => {
    const token = await AsyncStorage.getItem("token");
    const storedUserId = await AsyncStorage.getItem("userId");

    if (!token || !storedUserId) {
      router.replace("/qr-login");
      return;
    }

    setUserId(storedUserId);
    fetchUsers(token);
    connectSocket(storedUserId);
  };

  const fetchUsers = async (token: string) => {
    try {
      const res = await fetch("http://192.168.1.5:3000/api/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const connectSocket = (id: string) => {
    if (!socket || !socket.connected) {
      socket = io("http://192.168.1.5:4001");
    }

    socket.emit("join", id);

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
      console.log("Connected");
      setIsOnline(true);
      socket.emit("join", id);

      if (!hasSentPending.current) {
        sendPendingMessages();
        hasSentPending.current = true;
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected");
      setIsOnline(false);
      hasSentPending.current = false;
    });

    socket.on("message", handleMessage);

    return () => {
      socket.off("message", handleMessage);
      socket.off("connect");
      socket.off("disconnect");
    };
  };

  useEffect(() => {
    const refreshToken = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://192.168.1.5:3000/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          await AsyncStorage.setItem("token", data.token);
          console.log("✅ Token refreshed");
        } else {
          console.error("Token refresh failed");
        }
      } catch (error) {
        console.error("Token refresh error:", error);
      }
    };

    refreshToken();
    const interval = setInterval(refreshToken, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected || false;
      setIsOnline(connected);

      if (connected && userId && !hasSentPending.current) {
        sendPendingMessages();
        hasSentPending.current = true;
      } else if (!connected) {
        hasSentPending.current = false;
      }
    });

    return unsubscribe;
  };

  const sendPendingMessages = async () => {
    const pending = await AsyncStorage.getItem("pendingMessages");
    if (pending) {
      const pendingMsgs: Message[] = JSON.parse(pending);

      pendingMsgs.forEach((msg) => {
        socket.emit("send-message", msg);
      });

      await AsyncStorage.removeItem("pendingMessages");

      setMessages((prev) =>
        prev.map((m) => ({ ...m, pending: false }))
      );
    }
  };

  const sendMessage = async () => {
    if (!text || !userId || !receiverId) return;

    const encryptedContent = encryptMessage(text);
    const newMessage: Message = {
      senderId: userId,
      receiverId,
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
      const pending = await AsyncStorage.getItem("pendingMessages");
      const pendingMsgs = pending ? JSON.parse(pending) : [];
      pendingMsgs.push(newMessage);
      await AsyncStorage.setItem("pendingMessages", JSON.stringify(pendingMsgs));

      setMessages((prev) => [
        ...prev,
        { ...newMessage, content: text, pending: true },
      ]);
    }

    setText("");
  };

  const handleLogout = async () => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      try {
        await fetch("http://192.168.1.5:3000/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ token })
        });
      } catch (e) { console.error(e); }
    }
    await AsyncStorage.clear();
    router.replace("/qr-login");
  };

  const exportBackup = async () => {
    try {
      const backup = {
        messages: messages.map(m => ({
          ...m,
          content: encryptMessage(m.content)
        })),
        userId,
        exportedAt: new Date().toISOString(),
      };

      const fileName = `chat-backup-${Date.now()}.json`;
      const directory = FileSystemLegacy.cacheDirectory || FileSystemLegacy.documentDirectory;
      const fileUri = `${directory}${fileName}`;

      await FileSystemLegacy.writeAsStringAsync(fileUri, JSON.stringify(backup, null, 2));

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Save Chat Backup',
      });

      Toast.show({
        type: 'success',
        text1: 'Backup Exported',
        text2: 'Chat backup exported successfully!',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const importBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset || !asset.uri) {
        Toast.show({
          type: 'error',
          text1: 'No File Selected',
          text2: 'Please select a backup file',
        });
        return;
      }

      const fileContent = await FileSystemLegacy.readAsStringAsync(asset.uri);
      const backup = JSON.parse(fileContent);

      if (!backup.messages || !Array.isArray(backup.messages)) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Backup',
          text2: 'The backup file format is invalid',
        });
        return;
      }

      const restoredMessages = backup.messages.map((m: Message) => ({
        ...m,
        content: decryptMessage(m.content),
        pending: false,
      }));

      setMessages(restoredMessages);
      Toast.show({
        type: 'success',
        text1: 'Backup Restored',
        text2: `Successfully restored ${restoredMessages.length} messages!`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const currentChatMessages = messages.filter(
    (m) =>
      (m.senderId === userId && m.receiverId === receiverId) ||
      (m.senderId === receiverId && m.receiverId === userId)
  );

  if (!userId) {
    return (
      <LinearGradient colors={['#0f172a', '#581c87', '#0f172a']} style={styles.container}>
        <Toast />
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    );
  }

  if (!receiverId) {
    return (
      <LinearGradient colors={['#0f172a', '#581c87', '#0f172a']} style={styles.container}>
        <Toast />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
          <Text style={styles.statusLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>

        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userCard}
              onPress={() => {
                setReceiverId(item._id);
                setReceiverName(item.name);
              }}
            >
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#581c87', '#0f172a']} style={styles.container}>
      <Toast />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setReceiverId(null)} style={styles.backButtonContainer}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{receiverName}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDotSmall, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
            <Text style={styles.statusTextSmall}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.backupContainer}>
        <TouchableOpacity style={styles.backupButton} onPress={exportBackup}>
          <LinearGradient colors={['#9333ea', '#7c3aed']} style={styles.buttonGradient}>
            <Text style={styles.backupButtonText}>📥 Export</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backupButton} onPress={importBackup}>
          <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.buttonGradient}>
            <Text style={styles.backupButtonText}>📤 Import</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {currentChatMessages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.messageBubble,
              m.senderId === userId ? styles.myMessage : styles.theirMessage,
            ]}
          >
            {m.senderId === userId ? (
              <LinearGradient colors={['#a78bfa', '#3b82f6']} style={styles.messageGradient}>
                <Text style={styles.messageText}>
                  {m.content}
                  {m.pending && <Text style={styles.pendingText}> ⏳</Text>}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.theirMessageBg}>
                <Text style={styles.messageText}>
                  {m.content}
                  {m.pending && <Text style={styles.pendingText}> ⏳</Text>}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          style={styles.input}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButtonContainer} onPress={sendMessage}>
          <LinearGradient colors={['#a78bfa', '#3b82f6']} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#c4b5fd',
    fontSize: 14,
  },
  chatHeader: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonContainer: {
    padding: 8,
  },
  backButton: {
    color: 'white',
    fontSize: 28,
    fontWeight: '600',
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  chatHeaderName: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextSmall: {
    color: '#c4b5fd',
    fontSize: 12,
  },
  loadingText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 8,
  },
  messageBubble: {
    maxWidth: "75%",
    marginVertical: 4,
  },
  myMessage: {
    alignSelf: "flex-end",
  },
  theirMessage: {
    alignSelf: "flex-start",
  },
  messageGradient: {
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  theirMessageBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
  },
  pendingText: {
    fontSize: 12,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: "#fff",
    padding: 12,
    borderRadius: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backupContainer: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  backupButton: {
    flex: 1,
  },
  buttonGradient: {
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  backupButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  sendButtonContainer: {
    justifyContent: 'center',
  },
  sendButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});