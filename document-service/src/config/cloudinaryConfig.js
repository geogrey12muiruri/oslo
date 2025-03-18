const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'medplus',  // Folder name on Cloudinary
    format: async (req, file) => 'pdf',  // Force PDF format
    public_id: (req, file) => `${Date.now()}-${file.originalname}`
  }
});

// Set file size limit to 50MB
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024  // 50 MB limit
  }
});

module.exports = { upload, cloudinary };
