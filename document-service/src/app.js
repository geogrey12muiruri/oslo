const express = require('express');
const cors = require('cors');
require('dotenv').config();

const documentRoutes = require('./routes/document.routes'); // Adjust path if needed

const app = express();

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use('/uploads', express.static('uploads')); // Serve static files from uploads directory

// Routes
app.use('/api', documentRoutes); // Mount document routes under /api

module.exports = app;