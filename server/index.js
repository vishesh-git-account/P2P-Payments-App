const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const http = require('http'); 
const { Server } = require('socket.io'); 
const { apiLimiter } = require('./middleware/rateLimiter');


// --- NEW IMPORTS FOR GARBAGE COLLECTION ---
const cron = require('node-cron');
const Transaction = require('./models/Transaction'); 
// ------------------------------------------

dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();


// ==========================================
// 1. SOCKET.IO REAL-TIME SETUP
// ==========================================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Map to track which user ID belongs to which socket connection
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // When frontend tells us who just logged in
  socket.on('register', (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`👤 User ${userId} linked to socket ${socket.id}`);
  });

  // When they close the tab
  socket.on('disconnect', () => {
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Attach io and connectedUsers to Express so controllers can use them
app.set('io', io);
app.set('connectedUsers', connectedUsers);


// ==========================================
// 2. MIDDLEWARE & ROUTES
// ==========================================
app.use(cors());

// STRIPE WEBHOOK (Must be raw data, must be BEFORE express.json)
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Standard JSON body parser
app.use(express.json());

// Apply blanket rate limiting to all /api routes
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);

// Base route for testing
app.get('/', (req, res) => {
  res.send('Payment Gateway Server is running...');
});


// ==========================================
// 3. DATABASE, CRON JOBS & SERVER START
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.log('❌ MongoDB Connection Error: ', err));

// ==========================================
// BACKGROUND GARBAGE COLLECTOR
// ==========================================
// This runs automatically every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('🧹 Running background cleanup for abandoned payments...');
  
  try {
    // Find the exact time it was 30 minutes ago
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find all 'pending' transactions created more than 30 mins ago
    const result = await Transaction.updateMany(
      { 
        status: 'pending', 
        createdAt: { $lt: thirtyMinutesAgo } 
      },
      { 
        $set: { status: 'failed' } 
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🗑️ Cleaned up ${result.modifiedCount} abandoned transactions.`);
    }
  } catch (error) {
    console.error('❌ Error during background cleanup:', error);
  }
});

const PORT = process.env.PORT || 5000;

// IMPORTANT: We use server.listen() instead of app.listen() to support WebSockets!
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));