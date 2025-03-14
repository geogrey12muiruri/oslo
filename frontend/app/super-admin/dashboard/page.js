"use client";

import React from 'react';
import RoleProtectedRoute from '../../../components/RoleProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import TenantManagement from './TenantManagement';

const SuperAdminDashboard = () => {
  return (
    <RoleProtectedRoute requiredRole="SUPER_ADMIN">
      <DashboardLayout>
        <div>
          <h1>Super Admin Dashboard</h1>
          <TenantManagement />
        </div>
      </DashboardLayout>
    </RoleProtectedRoute>
  );
};

export default SuperAdminDashboard;
