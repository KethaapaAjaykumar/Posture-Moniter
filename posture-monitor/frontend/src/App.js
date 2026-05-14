import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import PhysioDashboard from "./pages/PhysioDashboard";

// Protected route wrapper
function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/patient" element={
        <ProtectedRoute role="PATIENT">
          <PatientDashboard />
        </ProtectedRoute>
      } />

      <Route path="/physio" element={
        <ProtectedRoute role="PHYSIOTHERAPIST">
          <PhysioDashboard />
        </ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={
        user
          ? <Navigate to={user.role === "PHYSIOTHERAPIST" ? "/physio" : "/patient"} replace />
          : <Navigate to="/login" replace />
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
