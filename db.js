
// test file for mangodb connection
const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = String(process.env.MONGODB_URI || '');
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Error connecting to MongoDB', err);
    process.exit(1);
  }
};

// test this connection

connectDB();
