const express = require('express');
const { createDocument } = require('../controllers/document.controller');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/documents', authMiddleware, adminMiddleware, createDocument);

module.exports = router;