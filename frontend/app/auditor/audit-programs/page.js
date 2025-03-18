"use client";

import { useState, useEffect } from "react";
import {
  Button,
  IconButton,
  Tabs,
  Tab,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useRouter } from "next/navigation";

export default function AuditProgramsPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [auditPrograms, setAuditPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch("http://localhost:5004/api/audit-programs");
        if (!response.ok) {
          throw new Error("Failed to fetch audit programs");
        }
        const data = await response.json();
        setAuditPrograms(data);
      } catch (error) {
        console.error("Error fetching audit programs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleCreateProgram = () => {
    router.push("/auditor/new-program");
  };

  const handleViewProgram = (id) => {
    router.push(`/auditor/audit/${id}`);
  };

  if (loading) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <Typography variant="h4" component="h1" className="mb-4 font-bold">
          Audit Programs
        </Typography>
        <Typography>Loading...</Typography>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <Typography variant="h4" component="h1" className="mb-4 font-bold">
        Audit Programs
      </Typography>

      {/* Tabs for filtering programs */}
      <Tabs
        value={tab}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        className="mb-6"
      >
        <Tab label="Active Programs" />
        <Tab label="Completed Programs" />
        <Tab label="Scheduled Programs" />
        <Tab label="Draft Programs" />
      </Tabs>

      {/* Create New Program Icon Button */}
      <div className="flex justify-end mb-4">
        <IconButton color="primary" onClick={handleCreateProgram}>
          <AddIcon />
        </IconButton>
      </div>

      {/* Program Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auditPrograms
              .filter((program) =>
                tab === 0
                  ? program.status === "Active"
                  : tab === 1
                  ? program.status === "Completed"
                  : tab === 2
                  ? program.status === "Scheduled"
                  : program.status === "Draft"
              )
              .map((program) => (
                <TableRow key={program.id}>
                  <TableCell>{program.id}</TableCell>
                  <TableCell>{program.name}</TableCell>
                  <TableCell>{program.status}</TableCell>
                  <TableCell>{program.priority}</TableCell>
                  <TableCell>{new Date(program.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(program.endDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                  <Button
                      variant="outlined"
                      size="small"
                      className="mr-2"
                      onClick={() => handleViewProgram(program.id)}
                    >
                      View
                    </Button>
                    <Button variant="outlined" size="small" color="secondary" className="mr-2">
                      Edit
                    </Button>
                    <Button variant="outlined" size="small" color="error">
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}