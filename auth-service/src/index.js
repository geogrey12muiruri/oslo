const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); // if you want cross-origin support
const morgan = require('morgan'); // for logging
const connectDB = require('./services/db'); // Database connection service
const routes = require('./routes/index'); // Import all routes here

dotenv.config(); // Load environment variables from .env

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable cross-origin requests
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Log requests to the console

// Database connection
connectDB();

// Routes
app.use('/api', routes); // All routes will be prefixed with `/api`

// Start server
app.listen(port, () => {
  console.log(`Auth Service running on port ${port}`);
});

