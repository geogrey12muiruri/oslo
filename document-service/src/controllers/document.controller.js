const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const amqp = require('amqplib');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const createDocument = async (req, res) => {
  const { title, category, version, revision, description } = req.body;
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    // Fetch the latest revision number for the given version
    const latestDocument = await prisma.document.findFirst({
      where: { version },
      orderBy: { revision: 'desc' },
    });

    // Increment the revision number if the version already exists
    const newRevision = latestDocument ? latestDocument.revision + 1 : revision;

    const document = await prisma.document.create({
      data: {
        title,
        category,
        version,
        revision: newRevision,
        description,
        fileUrl,
      },
    });

    // Publish an event to RabbitMQ
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    const queue = 'document_created';
    const message = JSON.stringify({
      id: document.id,
      title: document.title,
      category: document.category,
      version: document.version,
      revision: document.revision,
      description: document.description,
      fileUrl: document.fileUrl,
      createdAt: document.createdAt,
    });

    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(message));
    console.log('Document created event published:', message);

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
};

const getDocuments = async (req, res) => {
  try {
    const documents = await prisma.document.findMany();
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

module.exports = {
  createDocument,
  getDocuments,
  upload,
};