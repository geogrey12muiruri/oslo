const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const { Kafka } = require('kafkajs');
const { PrismaClient } = require('@prisma/client');
const connectDB = require('./services/db');
const routes = require('./routes/index');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Database connection
connectDB();

// Kafka setup
const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  retry: {
    initialRetryTime: 500,
    retries: 15,
    maxRetryTime: 60000,
  },
});

const consumer = kafka.consumer({ groupId: 'auth-group' });

const runConsumer = async () => {
  let retries = 15;
  while (retries > 0) {
    try {
      await consumer.connect();
      console.log('Kafka consumer connected');

      await consumer.subscribe({ topic: 'tenant.created', fromBeginning: true });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const tenantData = JSON.parse(message.value.toString());
            console.log(`Received tenant.created event: ${tenantData.id}`);

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
      break; // Exit loop on success
    } catch (err) {
      console.error('Failed to connect to Kafka:', err.message);
      retries--;
      if (retries === 0) {
        console.error('Max retries reached. Running without Kafka.');
        break; // Proceed without Kafka or exit if critical
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
    }
  }
};

// Start Kafka consumer and server
const startApp = async () => {
  try {
    await runConsumer();
    app.use('/api', routes);
    app.listen(port, () => {
      console.log(`Auth Service running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start app:', err);
  }
};

startApp();

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await consumer.disconnect();
  await prisma.$disconnect();
  console.log('Kafka consumer and Prisma disconnected');
  process.exit(0);
});