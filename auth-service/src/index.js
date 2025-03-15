const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const { Kafka } = require('kafkajs');
const { PrismaClient } = require('@prisma/client');
const connectDB = require('./services/db'); // Database connection service
const routes = require('./routes/index'); // Import all routes

dotenv.config(); // Load environment variables from .env

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable cross-origin requests
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Log requests to the console

// Database connection
connectDB();

// Kafka setup
const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});
const consumer = kafka.consumer({ groupId: 'auth-group' });

const runConsumer = async () => {
  try {
    await consumer.connect();
    console.log('Kafka consumer connected');

    // Subscribe to tenant.created topic
    await consumer.subscribe({ topic: 'tenant.created', fromBeginning: true });

    // Process messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const tenantData = JSON.parse(message.value.toString());
          console.log(`Received tenant.created event: ${tenantData.id}`);

          // Upsert tenant into auth-service Tenant table
          await prisma.tenant.upsert({
            where: { id: tenantData.id },
            update: {
              name: tenantData.name,
              domain: tenantData.domain,
              logoUrl: tenantData.logoUrl,
              address: tenantData.address,
              city: tenantData.city,
              country: tenantData.country,
              phone: tenantData.phone,
              email: tenantData.email,
              type: tenantData.type,
              accreditationNumber: tenantData.accreditationNumber,
              establishedYear: tenantData.establishedYear,
              timezone: tenantData.timezone,
              currency: tenantData.currency,
              status: tenantData.status,
              createdBy: tenantData.createdBy,
              createdAt: new Date(tenantData.createdAt),
              updatedAt: new Date(tenantData.updatedAt),
            },
            create: {
              id: tenantData.id,
              name: tenantData.name,
              domain: tenantData.domain,
              logoUrl: tenantData.logoUrl,
              address: tenantData.address,
              city: tenantData.city,
              country: tenantData.country,
              phone: tenantData.phone,
              email: tenantData.email,
              type: tenantData.type,
              accreditationNumber: tenantData.accreditationNumber,
              establishedYear: tenantData.establishedYear,
              timezone: tenantData.timezone,
              currency: tenantData.currency,
              status: tenantData.status,
              createdBy: tenantData.createdBy,
              createdAt: new Date(tenantData.createdAt),
              updatedAt: new Date(tenantData.updatedAt),
            },
          });

          console.log(`Tenant ${tenantData.id} upserted in auth-service`);
        } catch (error) {
          console.error('Error processing tenant.created event:', error);
        }
      },
    });
  } catch (err) {
    console.error('Failed to start Kafka consumer:', err);
  }
};

// Start Kafka consumer
runConsumer().catch(console.error);

// Routes
app.use('/api', routes); // All routes prefixed with `/api`

// Start server
app.listen(port, () => {
  console.log(`Auth Service running on port ${port}`);
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await consumer.disconnect();
  await prisma.$disconnect();
  console.log('Kafka consumer and Prisma disconnected');
  process.exit(0);
});