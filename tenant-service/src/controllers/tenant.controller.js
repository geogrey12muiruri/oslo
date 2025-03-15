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

// Tenant creation with Kafka
const createTenant = async (req, res) => {
  const {
    name,
    domain,
    logoUrl,
    address,
    city,
    country,
    phone,
    email,
    type,
    accreditationNumber,
    establishedYear,
    timezone,
    currency,
    status,
    initialAdminEmail,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // Create tenant (Update 'institution' to 'tenant' if schema was adjusted)
    const tenant = await prisma.institution.create({
      data: {
        name,
        domain,
        logoUrl,
        address,
        city,
        country,
        phone,
        email,
        type,
        accreditationNumber,
        establishedYear,
        timezone,
        currency,
        status,
        createdBy: req.user.userId,
      },
    });

    // Optionally create initial admin user
    let initialAdmin = null;
    if (initialAdminEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: initialAdminEmail },
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      initialAdmin = await prisma.user.create({
        data: {
          email: initialAdminEmail,
          role: 'ADMIN',
          institutionId: tenant.id, // Update to 'tenantId' if schema changed
        },
      });
    }

    // Publish tenant_created event to Kafka
    await producer.send({
      topic: 'tenant.created',
      messages: [
        {
          value: JSON.stringify({
            id: tenant.id,
            name,
            domain,
            logoUrl,
            address,
            city,
            country,
            phone,
            email,
            type,
            accreditationNumber,
            establishedYear,
            timezone,
            currency,
            status,
            createdBy: req.user.userId,
            createdAt: tenant.createdAt.toISOString(),
            updatedAt: tenant.updatedAt.toISOString(),
          }),
        },
      ],
    });

    // Publish user_created event if admin was created
    if (initialAdmin) {
      await producer.send({
        topic: 'user.created',
        messages: [
          {
            value: JSON.stringify({
              id: initialAdmin.id,
              email: initialAdmin.email,
              role: initialAdmin.role,
              tenantId: tenant.id,
            }),
          },
        ],
      });
    }

    res.status(201).json({ tenant, initialAdmin });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create user with Kafka
const createUser = async (req, res) => {
  const { tenantId } = req.params;
  const { email, role } = req.body;

  try {
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    const tenant = await prisma.institution.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        role,
        institutionId: tenantId, // Update to 'tenantId' if schema changed
      },
    });

    await producer.send({
      topic: 'user.created',
      messages: [
        {
          value: JSON.stringify({
            id: user.id,
            email,
            role,
            tenantId,
          }),
        },
      ],
    });

    res.status(201).json({
      message: 'User created',
      user,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Get all tenants (no events needed)
const getAllTenants = async (req, res) => {
  try {
    const tenants = await prisma.institution.findMany();
    res.status(200).json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

// Delete tenant with Kafka
const deleteTenant = async (req, res) => {
  const { tenantId } = req.params;

  try {
    const tenant = await prisma.institution.delete({
      where: { id: tenantId },
    });

    await producer.send({
      topic: 'tenant.deleted',
      messages: [
        {
          value: JSON.stringify({
            id: tenant.id,
            name: tenant.name,
          }),
        },
      ],
    });

    res.status(200).json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
};

module.exports = {
  createTenant,
  createUser,
  getAllTenants,
  deleteTenant,
};

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await producer.disconnect();
  console.log('Kafka producer disconnected');
});