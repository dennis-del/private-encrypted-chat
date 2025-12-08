import * as http from "http";
import { Server } from "socket.io";
import cors from "cors";

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // allow web + mobile
  },
});

io.on("connection", (socket) => {
  console.log("🔗 Socket connected:", socket.id);

  // User joins their own room using userId
  socket.on("join", (userId: string) => {
    socket.join(userId);
    console.log(`User joined room: ${userId}`);
  });

  // When sending message
  socket.on("send-message", (msg: any) => {
    // notify both sender and receiver
    io.to(msg.receiverId).emit("message", msg);
    io.to(msg.senderId).emit("message", msg);
  });
});

server.listen(4001, () => {
  console.log("🚀 Socket server running on port 4001");
});
