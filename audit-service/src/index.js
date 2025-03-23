require("dotenv").config();

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");
const { Kafka } = require("kafkajs");
const jwt = require("jsonwebtoken");

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 5004;

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const kafka = new Kafka({
  clientId: "audit-service",
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
  retry: {
    initialRetryTime: 100,
    retries: 5,
  },
});
const producer = kafka.producer();
let isProducerConnected = false;

// Connect Kafka producer with retry
const connectProducer = async () => {
  try {
    await producer.connect();
    isProducerConnected = true;
    console.log("Kafka producer connected in audit-service");
  } catch (err) {
    isProducerConnected = false;
    console.error("Failed to connect Kafka producer:", err);
  }
};

// Reusable send function with reconnection
const sendKafkaMessage = async (topic, message) => {
  try {
    if (!isProducerConnected) {
      await producer.connect();
      isProducerConnected = true;
      console.log("Kafka producer reconnected in audit-service");
    }
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(`Message sent to ${topic}:`, message);
  } catch (err) {
    isProducerConnected = false;
    console.error("Error sending Kafka message:", err);
    throw err;
  }
};

// Middleware to authenticate and extract user info from JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    console.log("Verifying token:", token);
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("Token decoded:", decoded);
    req.user = { userId: decoded.userId, role: decoded.role, tenantId: decoded.tenantId };
    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    res.status(403).json({ error: "Invalid token" });
  }
};

// Middleware to restrict access to admins
const restrictToAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Middleware to restrict to Auditor General
const restrictToAuditorGeneral = (req, res, next) => {
  if (req.user.role !== "AUDITOR_GENERAL") {
    return res.status(403).json({ error: "Auditor General access required" });
  }
  next();
};

// Initialize producer at startup
connectProducer();

const consumer = kafka.consumer({ groupId: "audit-service-group" });

const runConsumer = async () => {
  try {
    await consumer.connect();
    console.log("Kafka consumer connected in audit-service");

    // Subscribe to the user.created topic
    await consumer.subscribe({ topic: "user.created", fromBeginning: true });

    // Process each message
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const userData = JSON.parse(message.value.toString());
          console.log("Received user.created event:", userData);

          // Only process users with the AUDITOR role
          if (userData.role === "AUDITOR") {
            await prisma.user.upsert({
              where: { id: userData.id },
              update: {
                email: userData.email,
                role: userData.role,
                tenantId: userData.tenantId,
                updatedAt: new Date(),
              },
              create: {
                id: userData.id,
                email: userData.email,
                role: userData.role,
                tenantId: userData.tenantId,
                createdAt: new Date(userData.createdAt),
              },
            });
            console.log("User with AUDITOR role upserted in audit-service:", userData);
          }
        } catch (error) {
          console.error("Error processing user.created event:", error);
        }
      },
    });
  } catch (error) {
    console.error("Failed to start Kafka consumer in audit-service:", error);
  }
};

runConsumer();

// POST: Create Audit Program with Audits
app.post("/api/audit-programs", authenticateToken, restrictToAuditorGeneral, async (req, res) => {
  try {
    const { name, auditProgramObjective, startDate, endDate, audits } = req.body;
    const { userId, tenantId } = req.user;

    const auditProgram = await prisma.auditProgram.create({
      data: {
        id: `AP-${Date.now()}`,
        name,
        auditProgramObjective: auditProgramObjective || null,
        status: "Draft",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        tenantId,
        createdBy: userId,
        audits: {
          create: audits.map((audit) => ({
            id: audit.id || `A-${Date.now() + Math.random()}`,
            scope: audit.scope,
            specificAuditObjective: audit.specificAuditObjective,
            methods: audit.methods,
            criteria: audit.criteria,
          })),
        },
      },
      include: { audits: true },
    });
    res.status(201).json(auditProgram);
  } catch (error) {
    console.error("Error creating audit program:", error);
    res.status(500).json({ error: "Failed to create audit program" });
  }
});

// GET: Fetch All Audit Programs (Role-based filtering)
app.get("/api/audit-programs", authenticateToken, async (req, res) => {
  try {
    const { role, tenantId } = req.user;
    let programs;

    if (role === "AUDITOR_GENERAL") {
      programs = await prisma.auditProgram.findMany({
        where: { tenantId },
        include: { audits: true },
      });
    } else {
      programs = await prisma.auditProgram.findMany({
        where: { tenantId },
        include: { audits: true },
      });
    }
    res.json(programs);
  } catch (error) {
    console.error("Error fetching audit programs:", error);
    res.status(500).json({ error: "Failed to fetch audit programs" });
  }
});

// GET: Fetch Audit Programs for Admin (Admin-specific)
app.get("/api/audit-programs/admin", authenticateToken, restrictToAdmin, async (req, res) => {
  try {
    const { tenantId } = req.user;
    const programs = await prisma.auditProgram.findMany({
      where: {
        tenantId,
        status: {
          in: ["Pending Approval", "Scheduled", "Active", "Completed"],
        },
      },
      include: { audits: true },
    });
    res.json(programs);
  } catch (error) {
    console.error("Error fetching admin audit programs:", error);
    res.status(500).json({ error: "Failed to fetch audit programs for admin" });
  }
});

// GET: Fetch Audit Program by ID
app.get("/api/audit-programs/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { tenantId, role } = req.user;
  try {
    const program = await prisma.auditProgram.findUnique({
      where: { id },
      include: { audits: true },
    });
    if (!program) {
      return res.status(404).json({ error: "Audit program not found" });
    }
    if (role !== "AUDITOR_GENERAL" && program.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this audit program" });
    }
    res.json(program);
  } catch (error) {
    console.error("Error fetching audit program by ID:", error);
    res.status(500).json({ error: "Failed to fetch audit program" });
  }
});

// POST: Create Audit under Audit Program
app.post("/api/audit-programs/:id/audits", authenticateToken, restrictToAuditorGeneral, async (req, res) => {
  try {
    const { id } = req.params;
    const { scope, specificAuditObjective, methods, criteria } = req.body;
    const { tenantId } = req.user;

    const program = await prisma.auditProgram.findUnique({ where: { id } });
    if (!program || program.tenantId !== tenantId) {
      return res.status(403).json({ error: "Invalid or unauthorized audit program" });
    }

    const audit = await prisma.audit.create({
      data: {
        id: `A-${Date.now()}`,
        auditProgramId: id,
        scope,
        specificAuditObjective,
        methods,
        criteria,
      },
    });
    res.status(201).json(audit);
  } catch (error) {
    console.error("Error creating audit:", error);
    res.status(500).json({ error: "Failed to create audit" });
  }
});

// PUT: Submit Audit Program for Approval
app.put("/api/audit-programs/:id/submit", authenticateToken, restrictToAuditorGeneral, async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.user;
  try {
    const program = await prisma.auditProgram.findUnique({ where: { id } });
    if (!program || program.tenantId !== tenantId) {
      return res.status(403).json({ error: "Unauthorized to submit this program" });
    }

    const auditProgram = await prisma.auditProgram.update({
      where: { id },
      data: { status: "Pending Approval" },
      include: { audits: true },
    });

    await sendKafkaMessage("audit.submitted", {
      id: auditProgram.id,
      name: auditProgram.name,
      status: auditProgram.status,
      tenantId: auditProgram.tenantId,
      submittedAt: new Date().toISOString(),
    });
    console.log(`Audit ${id} submitted and event published to Kafka`);

    res.json(auditProgram);
  } catch (error) {
    console.error("Error submitting audit program:", error);
    res.status(500).json({ error: "Failed to submit audit program" });
  }
});

// PUT: Approve Audit Program (Admin Only)
app.put("/api/audit-programs/:id/approve", authenticateToken, restrictToAdmin, async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.user;
  try {
    const program = await prisma.auditProgram.findUnique({ where: { id } });
    if (!program || program.tenantId !== tenantId) {
      return res.status(403).json({ error: "Unauthorized to approve this program" });
    }

    const auditProgram = await prisma.auditProgram.update({
      where: { id },
      data: { status: "Active" },
      include: { audits: true },
    });

    await sendKafkaMessage("audit-program-approved", {
      eventType: "auditProgramApproved",
      auditProgram: {
        id: auditProgram.id,
        name: auditProgram.name,
        auditProgramObjective: auditProgram.auditProgramObjective,
        status: auditProgram.status,
        startDate: auditProgram.startDate,
        endDate: auditProgram.endDate,
        tenantId: auditProgram.tenantId,
        audits: auditProgram.audits,
      },
      timestamp: new Date().toISOString(),
    });
    console.log(`Audit Program ${id} approved and event published to Kafka`);

    res.json(auditProgram);
  } catch (error) {
    console.error("Error approving audit program:", error);
    res.status(500).json({ error: "Failed to approve audit program" });
  }
});

// PUT: Reject Audit Program (Admin Only)
app.put("/api/audit-programs/:id/reject", authenticateToken, restrictToAdmin, async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.user;
  try {
    const program = await prisma.auditProgram.findUnique({ where: { id } });
    if (!program || program.tenantId !== tenantId) {
      return res.status(403).json({ error: "Unauthorized to reject this program" });
    }

    const auditProgram = await prisma.auditProgram.update({
      where: { id },
      data: { status: "Draft" },
      include: { audits: true },
    });

    await sendKafkaMessage("audit-program-rejected", {
      eventType: "auditProgramRejected",
      auditProgram: {
        id: auditProgram.id,
        name: auditProgram.name,
        status: auditProgram.status,
        tenantId: auditProgram.tenantId,
      },
      timestamp: new Date().toISOString(),
    });
    console.log(`Audit Program ${id} rejected and event published to Kafka`);

    res.json(auditProgram);
  } catch (error) {
    console.error("Error rejecting audit program:", error);
    res.status(500).json({ error: "Failed to reject audit program" });
  }
});

// PUT: Update Audit Team Post-Approval (Auditor General)
app.put("/api/audits/:id", authenticateToken, restrictToAuditorGeneral, async (req, res) => {
  const { id } = req.params;
  const { team } = req.body;
  const { tenantId } = req.user;

  try {
    const audit = await prisma.audit.findUnique({
      where: { id },
      include: { auditProgram: true },
    });
    if (!audit || audit.auditProgram.tenantId !== tenantId) {
      return res.status(403).json({ error: "Unauthorized to update this audit" });
    }

    const updatedAudit = await prisma.audit.update({
      where: { id },
      data: { team },
    });
    res.json(updatedAudit);
  } catch (error) {
    console.error("Error updating audit team:", error);
    res.status(500).json({ error: "Failed to update audit team" });
  }
});

// GET: Fetch Auditors for a Tenant
app.get("/api/auditors", authenticateToken, restrictToAuditorGeneral, async (req, res) => {
  const { tenantId } = req.user;

  try {
    const auditors = await prisma.user.findMany({
      where: { tenantId, role: "AUDITOR" },
      select: { id: true, email: true, createdAt: true },
    });
    res.json(auditors);
  } catch (error) {
    console.error("Error fetching auditors:", error);
    res.status(500).json({ error: "Failed to fetch auditors" });
  }
});

app.listen(port, () => {
  console.log(`Audit service running on port ${port}`);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down audit service...");
  await producer.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});