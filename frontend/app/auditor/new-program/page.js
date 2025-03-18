"use client";

import { useState, useEffect } from "react";
import {
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter } from "next/navigation";

// Replace dummy data with real data later (e.g., from /api/users)
const teamMembers = [
  { id: "user1", name: "John Doe" },
  { id: "user2", name: "Jane Smith" },
  { id: "user3", name: "Mike Johnson" },
  { id: "user4", name: "Emily Davis" },
];

const auditMethods = [
  "Interviews",
  "Document Review",
  "Checklist Completion",
  "Sampling",
  "Observation",
];

const auditCriteria = [
  "ISO Standards Compliance",
  "System Documentation Compliance",
  "Departmental Policies and Manuals",
  "Legal Documentations",
];

const allScopes = ["Finance", "HR", "Student Records", "Procurement"];

export default function NewProgramPage() {
  const [isClient, setIsClient] = useState(false);
  const [tab, setTab] = useState(0);
  const router = useRouter();
  const [newProgram, setNewProgram] = useState({
    name: "",
    description: "",
    status: "Draft",
    priority: "Medium",
    startDate: "",
    endDate: "",
    modules: [],
    objectives: "",
    methods: [],
    criteria: [],
    milestones: [],
    teams: [],
  });
  const [milestoneInput, setMilestoneInput] = useState({ name: "", date: "" });
  const [teamInput, setTeamInput] = useState({ name: "", leader: "", members: [] });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setIsClient(true);
    // TODO: Fetch team members from /api/users when available
  }, []);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProgram((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleModulesChange = (e) => {
    const value = e.target.value;
    if (value.includes("All")) {
      setNewProgram((prev) => ({ ...prev, modules: allScopes }));
    } else {
      setNewProgram((prev) => ({ ...prev, modules: value }));
    }
    if (errors.modules) setErrors((prev) => ({ ...prev, modules: "" }));
  };

  const handleMethodsChange = (e) => {
    setNewProgram((prev) => ({ ...prev, methods: e.target.value }));
  };

  const handleCriteriaChange = (e) => {
    setNewProgram((prev) => ({ ...prev, criteria: e.target.value }));
  };

  // Milestone Handlers
  const handleMilestoneInputChange = (e) => {
    const { name, value } = e.target;
    setMilestoneInput((prev) => ({ ...prev, [name]: value }));
  };

  const addMilestone = () => {
    if (milestoneInput.name && milestoneInput.date) {
      setNewProgram((prev) => ({
        ...prev,
        milestones: [...prev.milestones, milestoneInput],
      }));
      setMilestoneInput({ name: "", date: "" });
    }
  };

  const removeMilestone = (index) => {
    setNewProgram((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index),
    }));
  };

  // Team Handlers
  const handleTeamInputChange = (e) => {
    const { name, value } = e.target;
    setTeamInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleTeamMembersChange = (e) => {
    setTeamInput((prev) => ({ ...prev, members: e.target.value }));
  };

  const addTeam = () => {
    if (teamInput.name && teamInput.leader) {
      setNewProgram((prev) => ({
        ...prev,
        teams: [...prev.teams, teamInput],
      }));
      setTeamInput({ name: "", leader: "", members: [] });
    }
  };

  const removeTeam = (index) => {
    setNewProgram((prev) => ({
      ...prev,
      teams: prev.teams.filter((_, i) => i !== index),
    }));
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};
    if (!newProgram.name) newErrors.name = "Program Name is required";
    if (newProgram.modules.length === 0) newErrors.modules = "At least one targeted scope is required";
    if (!newProgram.objectives) newErrors.objectives = "Objectives are required";
    if (!newProgram.startDate) newErrors.startDate = "Start Date is required";
    if (!newProgram.endDate) newErrors.endDate = "End Date is required";
    if (newProgram.methods.length === 0) newErrors.methods = "At least one method is required";
    if (newProgram.criteria.length === 0) newErrors.criteria = "At least one criterion is required";
    if (newProgram.teams.length === 0) newErrors.teams = "At least one team is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormComplete = () => {
    return (
      !!newProgram.name &&
      newProgram.modules.length > 0 &&
      !!newProgram.objectives &&
      !!newProgram.startDate &&
      !!newProgram.endDate &&
      newProgram.methods.length > 0 &&
      newProgram.criteria.length > 0 &&
      newProgram.teams.length > 0
    );
  };

  const handleCreateProgram = async () => {
    if (!validateForm()) {
      setTab(0);
      return;
    }

    const programData = {
      id: `AP-${Date.now()}`,
      ...newProgram,
    };

    try {
      const response = await fetch("http://localhost:5004/api/audit-programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(programData),
      });

      if (!response.ok) {
        throw new Error("Failed to create audit program");
      }

      const createdProgram = await response.json();
      console.log("Created Program:", createdProgram);
      router.push("/auditor/audit-programs");
    } catch (error) {
      console.error("Error creating program:", error);
      setErrors((prev) => ({ ...prev, submit: "Failed to create program. Please try again." }));
    }
  };

  if (!isClient) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Typography variant="h4" component="h1" className="mb-6 font-bold text-gray-800">
        Create New Audit Program
      </Typography>

      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="fullWidth"
        className="mb-6 rounded-lg shadow-sm"
        sx={{ bgcolor: "grey.100" }}
      >
        <Tab
          label="Metadata"
          icon={newProgram.name && newProgram.priority ? <CheckCircleIcon color="success" /> : null}
          iconPosition="end"
        />
        <Tab
          label="Scope & Approach"
          icon={newProgram.modules.length > 0 && newProgram.objectives && newProgram.methods.length > 0 && newProgram.criteria.length > 0 ? <CheckCircleIcon color="success" /> : null}
          iconPosition="end"
        />
        <Tab
          label="Timeline"
          icon={newProgram.startDate && newProgram.endDate ? <CheckCircleIcon color="success" /> : null}
          iconPosition="end"
        />
        <Tab
          label="Teams"
          icon={newProgram.teams.length > 0 ? <CheckCircleIcon color="success" /> : null}
          iconPosition="end"
        />
      </Tabs>

      <Box
        sx={{
          bgcolor: "white",
          boxShadow: 3,
          p: 4,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "grey.200",
        }}
      >
        {/* Tab 1: Metadata */}
        {tab === 0 && (
          <>
            <TextField
              label="Program Name"
              name="name"
              value={newProgram.name}
              onChange={handleInputChange}
              fullWidth
              className="mb-4"
              required
              error={!!errors.name}
              helperText={errors.name}
              variant="outlined"
            />
            <TextField
              label="Description"
              name="description"
              value={newProgram.description}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
              className="mb-4"
              variant="outlined"
            />
            <TextField
              label="Priority"
              name="priority"
              value={newProgram.priority}
              onChange={handleInputChange}
              select
              fullWidth
              className="mb-4"
              variant="outlined"
            >
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </TextField>
          </>
        )}

        {/* Tab 2: Scope & Approach */}
        {tab === 1 && (
          <>
            <FormControl fullWidth className="mb-4">
              <InputLabel>Targeted Scope</InputLabel>
              <Select
                multiple
                name="modules"
                value={newProgram.modules}
                onChange={handleModulesChange}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                variant="outlined"
                error={!!errors.modules}
              >
                <MenuItem value="All">All</MenuItem>
                {allScopes.map((scope) => (
                  <MenuItem key={scope} value={scope}>
                    {scope}
                  </MenuItem>
                ))}
              </Select>
              {errors.modules && (
                <Typography variant="caption" color="error">
                  {errors.modules}
                </Typography>
              )}
            </FormControl>
            <TextField
              label="Objectives"
              name="objectives"
              value={newProgram.objectives}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
              className="mb-4"
              required
              error={!!errors.objectives}
              helperText={errors.objectives}
              variant="outlined"
              placeholder="e.g., Ensure compliance with policies across targeted scopes, identify discrepancies in processes."
            />
            <FormControl fullWidth className="mb-4">
              <InputLabel>Audit Methods</InputLabel>
              <Select
                multiple
                name="methods"
                value={newProgram.methods}
                onChange={handleMethodsChange}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                variant="outlined"
                error={!!errors.methods}
              >
                {auditMethods.map((method) => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </Select>
              {errors.methods && (
                <Typography variant="caption" color="error">
                  {errors.methods}
                </Typography>
              )}
            </FormControl>
            <FormControl fullWidth className="mb-4">
              <InputLabel>Audit Criteria</InputLabel>
              <Select
                multiple
                name="criteria"
                value={newProgram.criteria}
                onChange={handleCriteriaChange}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                variant="outlined"
                error={!!errors.criteria}
              >
                {auditCriteria.map((criterion) => (
                  <MenuItem key={criterion} value={criterion}>
                    {criterion}
                  </MenuItem>
                ))}
              </Select>
              {errors.criteria && (
                <Typography variant="caption" color="error">
                  {errors.criteria}
                </Typography>
              )}
            </FormControl>
          </>
        )}

        {/* Tab 3: Timeline */}
        {tab === 2 && (
          <>
            <TextField
              label="Start Date"
              name="startDate"
              type="date"
              value={newProgram.startDate}
              onChange={handleInputChange}
              fullWidth
              className="mb-4"
              required
              error={!!errors.startDate}
              helperText={errors.startDate}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
            />
            <TextField
              label="End Date"
              name="endDate"
              type="date"
              value={newProgram.endDate}
              onChange={handleInputChange}
              fullWidth
              className="mb-4"
              required
              error={!!errors.endDate}
              helperText={errors.endDate}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
            />
            <Typography variant="subtitle1" className="mb-2">
              Milestones
            </Typography>
            <Box className="flex gap-2 mb-4">
              <TextField
                label="Milestone Name"
                name="name"
                value={milestoneInput.name}
                onChange={handleMilestoneInputChange}
                size="small"
                variant="outlined"
              />
              <TextField
                label="Date"
                name="date"
                type="date"
                value={milestoneInput.date}
                onChange={handleMilestoneInputChange}
                size="small"
                InputLabelProps={{ shrink: true }}
                variant="outlined"
              />
              <IconButton color="primary" onClick={addMilestone}>
                <AddIcon />
              </IconButton>
            </Box>
            <Table size="small">
              <TableBody>
                {newProgram.milestones.map((milestone, index) => (
                  <TableRow key={index}>
                    <TableCell>{milestone.name}</TableCell>
                    <TableCell>{milestone.date}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => removeMilestone(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {/* Tab 4: Teams */}
        {tab === 3 && (
          <>
            <Typography variant="subtitle1" className="mb-2">
              Assign Teams
            </Typography>
            <Box className="mb-4">
              <TextField
                label="Team Name"
                name="name"
                value={teamInput.name}
                onChange={handleTeamInputChange}
                fullWidth
                className="mb-4"
                variant="outlined"
              />
              <FormControl fullWidth className="mb-4">
                <InputLabel>Team Leader</InputLabel>
                <Select
                  name="leader"
                  value={teamInput.leader}
                  onChange={handleTeamInputChange}
                  variant="outlined"
                >
                  {teamMembers.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth className="mb-4">
                <InputLabel>Team Members</InputLabel>
                <Select
                  multiple
                  value={teamInput.members}
                  onChange={handleTeamMembersChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((id) => (
                        <Chip
                          key={id}
                          label={teamMembers.find((m) => m.id === id)?.name}
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                  variant="outlined"
                >
                  {teamMembers.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={addTeam}
                className="mb-4"
              >
                Add Team
              </Button>
            </Box>
            <Table size="small">
              <TableBody>
                {newProgram.teams.map((team, index) => (
                  <TableRow key={index}>
                    <TableCell>{team.name}</TableCell>
                    <TableCell>
                      {teamMembers.find((m) => m.id === team.leader)?.name}
                    </TableCell>
                    <TableCell>
                      {team.members
                        .map((id) => teamMembers.find((m) => m.id === id)?.name)
                        .join(", ")}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => removeTeam(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {errors.teams && (
              <Typography variant="caption" color="error" className="mt-2">
                {errors.teams}
              </Typography>
            )}
          </>
        )}

        {/* Action Buttons */}
        <Box className="flex justify-between mt-6">
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => router.push("/auditor/audit-programs")}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateProgram}
            disabled={!isFormComplete()}
            startIcon={isFormComplete() ? <CheckCircleIcon /> : null}
          >
            Create Program
          </Button>
        </Box>
        {errors.submit && (
          <Typography variant="caption" color="error" className="mt-2">
            {errors.submit}
          </Typography>
        )}
      </Box>
    </div>
  );
}

export const dynamic = "force-dynamic";