import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { getAllPatients, getPatientSessions, getPatientSummary } from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function PhysioDashboard() {
  const { user, logout } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [patientSummary, setPatientSummary] = useState(null);

  useEffect(() => {
    getAllPatients().then((r) => setPatients(r.data));
  }, []);

  const selectPatient = async (patient) => {
    setSelected(patient);
    const [sessionRes, summaryRes] = await Promise.all([
      getPatientSessions(patient.id),
      getPatientSummary(patient.id),
    ]);
    setSessions(sessionRes.data);
    setPatientSummary(summaryRes.data);
  };

  // Build chart data from sessions
  const chartData = sessions.slice(0, 10).reverse().map((s, i) => ({
    name: `S${i + 1}`,
    score: Math.round(s.averageScore),
    exercise: s.exerciseType,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <span className="font-bold text-gray-800">PostureAI — Physiotherapist</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Dr. {user?.name}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Patient list */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Patients ({patients.length})</h2>
          {patients.length === 0 && (
            <p className="text-gray-400 text-sm">No patients registered yet.</p>
          )}
          <ul className="space-y-2">
            {patients.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => selectPatient(p)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${
                    selected?.id === p.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.email}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Patient detail */}
        <div className="lg:col-span-2 space-y-6">
          {!selected ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">
              Select a patient to view their analytics
            </div>
          ) : (
            <>
              {/* Summary */}
              {patientSummary && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-600 rounded-xl p-5 text-white">
                    <div className="text-4xl font-bold">{patientSummary.averageScore}</div>
                    <div className="text-blue-100 text-sm mt-1">Average posture score</div>
                  </div>
                  <div className="bg-teal-600 rounded-xl p-5 text-white">
                    <div className="text-4xl font-bold">{patientSummary.totalSessions}</div>
                    <div className="text-teal-100 text-sm mt-1">Total sessions</div>
                  </div>
                </div>
              )}

              {/* Score trend chart */}
              {chartData.length > 0 && (
                <div className="bg-white rounded-2xl shadow p-5">
                  <h3 className="font-semibold text-gray-700 mb-4">Score trend (last 10 sessions)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip
                        formatter={(v, n, p) => [v, `Score (${p.payload.exercise})`]}
                      />
                      <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Session table */}
              <div className="bg-white rounded-2xl shadow p-5">
                <h3 className="font-semibold text-gray-700 mb-3">
                  {selected.name}'s sessions
                </h3>
                {sessions.length === 0 ? (
                  <p className="text-gray-400 text-sm">No sessions recorded.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Exercise</th>
                        <th className="pb-2 font-medium">Duration</th>
                        <th className="pb-2 font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.sessionId} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 text-gray-600">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 text-gray-700">
                            {s.exerciseType.charAt(0) + s.exerciseType.slice(1).toLowerCase()}
                          </td>
                          <td className="py-2 text-gray-600">{s.duration}s</td>
                          <td className={`py-2 font-bold ${
                            s.averageScore >= 80 ? "text-green-600" :
                            s.averageScore >= 60 ? "text-yellow-500" : "text-red-500"
                          }`}>
                            {Math.round(s.averageScore)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
