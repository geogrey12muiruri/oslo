const express = require('express');
const { createDocument, getDocuments } = require('../controllers/document.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir); // Create uploads directory if it doesn’t exist
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Initialize Multer with local storage
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Optional: Limit file size to 10MB
  fileFilter: (req, file, cb) => {
    // Optional: Restrict file types (e.g., only PDFs)
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// Upload a document (with error handling for file upload)
router.post(
  '/documents',
  authMiddleware,
  adminMiddleware,
  upload.single('file'), // Use local storage middleware
  createDocument // Proceed directly to controller
);

// Get all documents
router.get('/documents', getDocuments);

module.exports = router;