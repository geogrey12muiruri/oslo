const express = require('express');
const cors = require('cors');
const documentRoutes = require('./routes/document.routes');
require('dotenv').config();

const app = express();

app.use(cors()); // Enable CORS
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve static files from the uploads directory
app.use('/api', documentRoutes);

module.exports = app;