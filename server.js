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

// 🔥 Socket Setup (FIXED PATH)
const io = new Server(server, {
  path: "/socket.io/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let users = {};

// MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ DB Error:", err));

// Schema
const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  message: String,
  time: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// Socket
io.on("connection", (socket) => {
  console.log("🔥 User Connected:", socket.id);

  socket.on("register", (userId) => {
    users[userId] = socket.id;
    console.log("👤 Users:", users);
  });

  socket.on("send_message", async (data) => {
    const { senderId, receiverId, message } = data;

    const newMsg = new Message({ senderId, receiverId, message });
    await newMsg.save();

    const receiverSocket = users[receiverId];

    if (receiverSocket) {
      io.to(receiverSocket).emit("receive_message", data);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User Disconnected:", socket.id);

    for (let userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
      }
    }
  });
});

// API
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
