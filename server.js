require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// 🌐 Create HTTP server
const server = http.createServer(app);

// 🔌 Socket setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 🧠 User Mapping
let users = {};

// 📦 MongoDB Connection (optional)
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// 📄 Message Schema
const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  message: String,
  time: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// 🔌 Socket Connection
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // 🟢 Register User
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    console.log("Users:", users);
  });

  // 💬 Send Message
  socket.on("send_message", async (data) => {
    const { senderId, receiverId, message } = data;

    // Save to DB
    const newMsg = new Message({ senderId, receiverId, message });
    await newMsg.save();

    // Send to receiver
    const receiverSocket = users[receiverId];
    if (receiverSocket) {
      io.to(receiverSocket).emit("receive_message", data);
    }
  });

  // ⌨️ Typing Indicator
  socket.on("typing", (data) => {
    const receiverSocket = users[data.receiverId];
    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", data);
    }
  });

  // ❌ Disconnect
  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);

    for (let userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
      }
    }
  });
});

// 🌐 API (Chat History)
app.get("/messages/:senderId/:receiverId", async (req, res) => {
  const { senderId, receiverId } = req.params;

  const messages = await Message.find({
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId },
    ],
  }).sort({ time: 1 });

  res.json(messages);
});

// 🟢 Root API
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// 🔥 Port for Render
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});