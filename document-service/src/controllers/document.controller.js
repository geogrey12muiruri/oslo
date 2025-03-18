const { PrismaClient } = require('@prisma/client');
const { Kafka } = require('kafkajs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Kafka setup
const kafka = new Kafka({
  clientId: 'document-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});
const producer = kafka.producer();

const connectProducer = async () => {
  try {
    await producer.connect();
    console.log('Kafka producer connected');
  } catch (err) {
    console.error('Failed to connect Kafka producer:', err);
  }
};

// Connect producer on startup
connectProducer();

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

const createDocument = async (req, res) => {
  console.log('Received request body:', req.body);
  console.log('Received file:', req.file);

  const { title, category, version, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'File upload failed' });
  }

  try {
    const latestDocument = await prisma.document.findFirst({
      where: { version },
      orderBy: { revision: 'desc' },
    });

    const newRevision = latestDocument ? (parseInt(latestDocument.revision) + 1).toString() : '1';

    const document = await prisma.document.create({
      data: {
        title,
        category,
        version,
        revision: newRevision,
        description,
        fileUrl: `/uploads/${req.file.filename}`,
      },
    });

    // Publish document.created event to Kafka
    await producer.send({
      topic: 'document.created',
      messages: [
        {
          value: JSON.stringify({
            id: document.id,
            title,
            category,
            version,
            revision: newRevision,
            description,
            fileUrl: document.fileUrl,
            createdAt: document.createdAt.toISOString(),
            updatedAt: document.updatedAt.toISOString(),
            createdBy: req.user?.userId || 'unknown', // Assuming authMiddleware adds user to req
          }),
        },
      ],
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document', details: error.message });
  }
};

const getDocuments = async (req, res) => {
  try {
    const documents = await prisma.document.findMany();
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
};

module.exports = {
  createDocument,
  getDocuments,
  upload,
};

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await producer.disconnect();
  console.log('Kafka producer disconnected');
});