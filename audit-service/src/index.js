const express = require("express");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 5004;

app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// POST: Create a new audit program
app.post("/api/audit-programs", async (req, res) => {
  try {
    const programData = req.body;
    const auditProgram = await prisma.auditProgram.create({
      data: {
        id: programData.id,
        name: programData.name,
        description: programData.description || null,
        status: programData.status,
        priority: programData.priority,
        startDate: new Date(programData.startDate),
        endDate: new Date(programData.endDate),
        modules: programData.modules,
        objectives: programData.objectives,
        methods: programData.methods,
        criteria: programData.criteria,
        milestones: programData.milestones, // JSON-compatible array
        teams: programData.teams, // JSON-compatible array
      },
    });
    res.status(201).json(auditProgram);
  } catch (error) {
    console.error("Error creating audit program:", error);
    res.status(500).json({ error: "Failed to create audit program" });
  }
});

// GET: Fetch all audit programs
app.get("/api/audit-programs", async (req, res) => {
  try {
    const programs = await prisma.auditProgram.findMany();
    res.json(programs);
  } catch (error) {
    console.error("Error fetching audit programs:", error);
    res.status(500).json({ error: "Failed to fetch audit programs" });
  }
});

// New GET by ID endpoint
app.get("/api/audit-programs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const program = await prisma.auditProgram.findUnique({
      where: { id },
    });
    if (!program) {
      return res.status(404).json({ error: "Audit program not found" });
    }
    res.json(program);
  } catch (error) {
    console.error("Error fetching audit program by ID:", error);
    res.status(500).json({ error: "Failed to fetch audit program" });
  }
});

app.listen(port, () => {
  console.log(`Audit service running on port ${port}`);
});