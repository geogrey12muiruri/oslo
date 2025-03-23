const { PrismaClient } = require('@prisma/client');
const { Kafka } = require('kafkajs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

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

connectProducer();

// Middleware to authenticate and extract userId from JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role }; // Populate req.user
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to restrict access to Super Admin
const restrictToSuperAdmin = (req, res, next) => {
  console.log('req.user:', req.user); // Debug log
  if (req.user?.role?.toUpperCase() !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
};

// All possible roles from UserRole enum
const REQUIRED_ROLES = [
  'STUDENT',
  'LECTURER',
  'HOD',
  'ADMIN',
  'REGISTRAR',
  'STAFF',
  'SUPER_ADMIN',
  'AUDITOR_GENERAL',
  'AUDITOR',
];

// Tenant creation with Kafka
const createTenant = async (req, res) => {
  const {
    name,
    domain,
    logoUrl,
    address,
    city,
    state,
    country,
    phone,
    email,
    type,
    accreditationNumber,
    establishedYear,
    timezone,
    currency,
    status,
    users,
    departments,
  } = req.body;

  // Validation
  const allowedTypes = ['UNIVERSITY', 'COLLEGE', 'SCHOOL', 'INSTITUTE'];
  if (!allowedTypes.includes(type.toUpperCase())) {
    return res.status(400).json({ error: `Invalid type. Allowed values are: ${allowedTypes.join(', ')}` });
  }

  if (!name || !domain || !email || !type || !users || !departments || departments.length === 0) {
    return res.status(400).json({ error: 'Name, domain, email, type, users, and at least one department are required' });
  }

  const providedRoles = users.map((u) => u.role.toUpperCase());
  const missingRoles = REQUIRED_ROLES.filter((role) => !providedRoles.includes(role));
  if (missingRoles.length > 0) {
    return res.status(400).json({ error: `Missing users for roles: ${missingRoles.join(', ')}` });
  }

  const userEmails = users.map((u) => u.email);
  if (new Set(userEmails).size !== userEmails.length) {
    return res.status(400).json({ error: 'Duplicate emails provided in users' });
  }

  const hodEmails = departments.map((d) => d.hodEmail);
  const hodUsers = users.filter((u) => u.role.toUpperCase() === 'HOD');
  const invalidHods = hodEmails.filter((email) => !hodUsers.some((u) => u.email === email));
  if (invalidHods.length > 0) {
    return res.status(400).json({ error: `Invalid HOD emails: ${invalidHods.join(', ')}` });
  }

  const deptNames = departments.map((d) => d.name);
  if (new Set(deptNames).size !== deptNames.length) {
    return res.status(400).json({ error: 'Duplicate department names provided' });
  }

  let tenant;
  try {
    tenant = await prisma.tenant.create({
      data: {
        name,
        domain,
        logoUrl,
        address,
        city,
        state,
        country,
        phone,
        email,
        type: type.toUpperCase(),
        accreditationNumber,
        establishedYear,
        timezone,
        currency,
        status: status || 'PENDING',
        createdBy: req.user.userId,
      },
    });

    const createdUsers = [];
    for (const userData of users) {
      const { email, role, firstName, lastName, password } = userData;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error(`Email ${email} already exists`);
      }

      const authResponse = await axios.post(
        'http://localhost:5000/api/register',
        { email, password, role, tenantId: tenant.id },
        { headers: { Authorization: `Bearer ${req.headers.authorization.split(' ')[1]}` } }
      );

      const user = await prisma.user.create({
        data: {
          id: authResponse.data.userId,
          email,
          role,
          firstName,
          lastName,
          tenantId: tenant.id,
          verified: false,
        },
      });

      createdUsers.push(user);

      await producer.send({
        topic: 'user.created',
        messages: [
          {
            value: JSON.stringify({
              id: user.id,
              email,
              role,
              tenantId: tenant.id,
              createdAt: user.createdAt.toISOString(),
              updatedAt: user.updatedAt.toISOString(),
            }),
          },
        ],
      });
    }

    const createdDepartments = [];
    for (const deptData of departments) {
      const { name, code, hodEmail } = deptData;
      const hod = createdUsers.find((u) => u.email === hodEmail && u.role === 'HOD');
      if (!hod) {
        throw new Error(`HOD ${hodEmail} not found among created users`);
      }

      const department = await prisma.department.create({
        data: {
          name,
          code,
          tenantId: tenant.id,
          headId: hod.id,
        },
      });

      createdDepartments.push(department);

      await producer.send({
        topic: 'department.created',
        messages: [
          {
            value: JSON.stringify({
              id: department.id,
              name,
              code,
              tenantId: tenant.id,
              headId: hod.id,
              createdAt: department.createdAt.toISOString(),
              updatedAt: department.updatedAt.toISOString(),
            }),
          },
        ],
      });
    }

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
            state,
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

    res.status(201).json({ tenant, users: createdUsers, departments: createdDepartments });
  } catch (error) {
    console.error('Error creating tenant:', error);
    if (tenant) {
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
    }
    if (error.response) {
      return res.status(error.response.status).json({ error: error.response.data.error });
    }
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

const getAllTenants = async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: { users: true, departments: { include: { head: true } } },
    });
    res.status(200).json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

const deleteTenant = async (req, res) => {
  const { tenantId } = req.params;

  try {
    const tenant = await prisma.tenant.delete({
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

const createUser = async (req, res) => {
  const { tenantId } = req.params;
  const { email, role, firstName, lastName, password } = req.body;

  if (!email || !role || !firstName || !lastName || !password) {
    return res.status(400).json({ error: 'Email, role, firstName, lastName, and password are required' });
  }

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const authResponse = await axios.post(
      'http://localhost:5000/api/register',
      { email, password, role, tenantId },
      { headers: { Authorization: `Bearer ${req.headers.authorization.split(' ')[1]}` } }
    );

    const user = await prisma.user.create({
      data: {
        id: authResponse.data.userId,
        email,
        role,
        firstName,
        lastName,
        tenantId,
        verified: false,
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
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          }),
        },
      ],
    });

    res.status(201).json({ user });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.response) {
      return res.status(error.response.status).json({ error: error.response.data.error });
    }
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

module.exports = {
  createTenant: [authenticateToken, restrictToSuperAdmin, createTenant],
  getAllTenants: [authenticateToken, restrictToSuperAdmin, getAllTenants],
  deleteTenant: [authenticateToken, restrictToSuperAdmin, deleteTenant],
  createUser: [authenticateToken, createUser],
};

process.on('SIGTERM', async () => {
  await producer.disconnect();
  console.log('Kafka producer disconnected');
});