import axios from "axios";

const API = axios.create({ baseURL: "/api" });

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  API.post("/auth/login", { email, password });

export const register = (data) =>
  API.post("/auth/register", data);

// ─── Sessions ────────────────────────────────────────────────────────────────
export const startSession = (exerciseType) =>
  API.post("/sessions/start", { exerciseType });

export const stopSession = (sessionId, averageScore, duration) =>
  API.post(`/sessions/${sessionId}/stop`, { averageScore, duration });

export const savePostureData = (sessionId, data) =>
  API.post(`/sessions/${sessionId}/data`, data);

export const getMySessions = () =>
  API.get("/sessions/my");

export const getSessionData = (sessionId) =>
  API.get(`/sessions/${sessionId}/data`);

// ─── Analytics ───────────────────────────────────────────────────────────────
export const getAnalyticsSummary = () =>
  API.get("/analytics/summary");

// ─── Physiotherapist ─────────────────────────────────────────────────────────
export const getAllPatients = () =>
  API.get("/physio/patients");

export const getPatientSessions = (patientId) =>
  API.get(`/physio/patients/${patientId}/sessions`);

export const getPatientSummary = (patientId) =>
  API.get(`/analytics/patient/${patientId}/summary`);
