const { PrismaClient } = require('@prisma/client');
const redis = require('redis');

const prisma = new PrismaClient();
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
});

// Connect to Redis
redisClient.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err);
});

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
    // Create tenant
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
        createdBy: req.user.userId, // Ensure this is correctly set
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
          institutionId: tenant.id,
        },
      });
    }

    // Emit tenant_created event
    await redisClient.publish('tenant_events', JSON.stringify({
      event: 'tenant_created',
      data: tenant,
    }));

    // Emit user_created event if admin was created
    if (initialAdmin) {
      await redisClient.publish('user_events', JSON.stringify({
        event: 'user_created',
        data: { id: initialAdmin.id, email: initialAdmin.email, role: initialAdmin.role, tenantId: tenant.id },
      }));
    }

    res.status(201).json({ tenant, initialAdmin });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

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
        institutionId: tenantId,
      },
    });

    await redisClient.publish('user_events', JSON.stringify({
      event: 'user_created',
      data: { id: user.id, email, role, tenantId },
    }));

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

const getAllTenants = async (req, res) => {
  try {
    const tenants = await prisma.institution.findMany();
    res.status(200).json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

const deleteTenant = async (req, res) => {
  const { tenantId } = req.params;

  try {
    const tenant = await prisma.institution.delete({
      where: { id: tenantId },
    });

    await redisClient.publish('tenant_events', JSON.stringify({
      event: 'tenant_deleted',
      data: tenant,
    }));

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

process.on('SIGTERM', async () => {
  await redisClient.quit();
});