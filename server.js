require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// 🔥 Socket Setup
const io = new Server(server, {
  path: "/socket.io/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let users = {};

// ✅ MongoDB Connect
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ DB Error:", err));

// ✅ Schema
const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  message: String,
  time: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// 🔥 SOCKET LOGIC
io.on("connection", (socket) => {
  console.log("🔥 User Connected:", socket.id);

  // ✅ Register user
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    console.log("👤 Users:", users);
  });

  // ✅ Send Message
  socket.on("send_message", async (data) => {
    console.log("📩 Incoming:", data);

    const { senderId, receiverId, message } = data;

    const receiverSocket = users[receiverId];

    console.log("👉 Receiver Socket:", receiverSocket);

    // 🔥 Send instantly (REAL TIME)
    if (receiverSocket) {
      io.to(receiverSocket).emit("receive_message", data);
      console.log("✅ Message delivered");
    } else {
      console.log("📦 User offline, saved only");
    }

    // 🔥 Save to DB (safe)
    try {
      const newMsg = new Message({ senderId, receiverId, message });
      await newMsg.save();
      console.log("💾 Saved to DB");
    } catch (err) {
      console.log("❌ DB Error:", err);
    }
  });

  // ❌ Disconnect
  socket.on("disconnect", () => {
    console.log("❌ User Disconnected:", socket.id);

    for (let userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
      }
    }
  });
});

// 🌐 Test API
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
