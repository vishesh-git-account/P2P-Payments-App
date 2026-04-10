const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();
// Import routes
const authRoutes = require('./routes/authRoutes'); // <-- ADD THIS
const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

// dotenv.config();
const app = express();

app.use(cors());

app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.log('❌ MongoDB Connection Error: ', err));

// Use routes
app.use('/api/auth', authRoutes); // <-- ADD THIS

app.get('/', (req, res) => {
  res.send('Payment Gateway Server is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));