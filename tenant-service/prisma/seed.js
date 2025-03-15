const { PrismaClient } = require('@prisma/client');
const { Kafka } = require('kafkajs');

const prisma = new PrismaClient();

// Kafka setup
const kafka = new Kafka({
  clientId: 'tenant-service',
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

async function main() {
  // Seed tenants
  const tenant = await prisma.tenant.create({
    data: {
      name: `University of Nairobi ${Date.now()}`, // Use a unique name
      domain: `uon${Date.now()}.ac.ke`, // Use a unique domain
      logoUrl: 'https://example.com/logo.png',
      address: 'P.O. Box 30197, Nairobi, Kenya',
      city: 'Nairobi',
      country: 'Kenya',
      phone: '+254 20 3318262',
      email: `info${Date.now()}@uon.ac.ke`, // Use a unique email
      type: 'PUBLIC',
      accreditationNumber: 'CUE/12345',
      establishedYear: 1956,
      timezone: 'Africa/Nairobi',
      currency: 'KES',
      status: 'ACTIVE',
      createdBy: 'super-admin-id', // Replace with actual Super Admin ID
    },
  });

  // Publish tenant_created event to Kafka
  await producer.send({
    topic: 'tenant.created',
    messages: [
      {
        value: JSON.stringify({
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          logoUrl: tenant.logoUrl,
          address: tenant.address,
          city: tenant.city,
          country: tenant.country,
          phone: tenant.phone,
          email: tenant.email,
          type: tenant.type,
          accreditationNumber: tenant.accreditationNumber,
          establishedYear: tenant.establishedYear,
          timezone: tenant.timezone,
          currency: tenant.currency,
          status: tenant.status,
          createdBy: tenant.createdBy,
          createdAt: tenant.createdAt.toISOString(),
          updatedAt: tenant.updatedAt.toISOString(),
        }),
      },
    ],
  });

  // Seed users
  const user = await prisma.user.create({
    data: {
      email: `admin${Date.now()}@uon.ac.ke`, // Use a unique email
      tenantId: tenant.id,
      role: 'ADMIN',
    },
  });

  // Publish user_created event to Kafka
  await producer.send({
    topic: 'user.created',
    messages: [
      {
        value: JSON.stringify({
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: tenant.id,
        }),
      },
    ],
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await producer.disconnect();
    await prisma.$disconnect();
  });