const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const contactRoutes = require('./routes/contact');
const visitorRoutes = require('./routes/visitor');

const app = express();
const server = http.createServer(app);

// ===== SOCKET.IO SETUP =====
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Track live visitors
let onlineVisitors = 0;
const visitorSockets = new Set();

io.on('connection', (socket) => {
  visitorSockets.add(socket.id);
  onlineVisitors = visitorSockets.size;

  // Broadcast updated count to ALL clients
  io.emit('visitor_count', { count: onlineVisitors });
  console.log(`✅ Visitor connected: ${socket.id} | Total: ${onlineVisitors}`);

  socket.on('disconnect', () => {
    visitorSockets.delete(socket.id);
    onlineVisitors = visitorSockets.size;
    io.emit('visitor_count', { count: onlineVisitors });
    console.log(`❌ Visitor left: ${socket.id} | Total: ${onlineVisitors}`);
  });
});

// Attach io to app so routes can use it
app.set('io', io);

// ===== MIDDLEWARE =====
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for contact form (max 5 per 15 min per IP)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many messages sent. Please try again in 15 minutes.' },
});

// ===== ROUTES =====
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/visitors', visitorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PrabhuOS Backend is running 🚀',
    timestamp: new Date().toISOString(),
    visitors: onlineVisitors,
  });
});

// ===== MONGODB CONNECTION =====
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 PrabhuOS Server running on port ${PORT}`);
      console.log(`📡 Socket.io ready for real-time connections`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
