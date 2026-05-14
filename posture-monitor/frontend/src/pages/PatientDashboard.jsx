import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  getMySessions,
  getAnalyticsSummary,
  startSession,
  stopSession,
  savePostureData,
} from "../services/api";
import PoseCamera from "../components/patient/PoseCamera";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({ averageScore: 0, totalSessions: 0 });
  const [activeSession, setActiveSession] = useState(null);
  const [scores, setScores] = useState([]); // live score history for chart
  const sessionRef = useRef(null);
  const scoreAccum = useRef([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sessionRes, summaryRes] = await Promise.all([
      getMySessions(),
      getAnalyticsSummary(),
    ]);
    setSessions(sessionRes.data);
    setSummary(summaryRes.data);
  };

  // Called by PoseCamera each time a score is computed
  const handlePostureData = async (data) => {
    if (!sessionRef.current) return;
    scoreAccum.current.push(data.score);

    // Update live chart (last 30 points)
    setScores((prev) => {
      const updated = [...prev, { t: prev.length + 1, score: Math.round(data.score) }];
      return updated.slice(-30);
    });

    // Save to backend every 5th data point to avoid flooding
    if (scoreAccum.current.length % 5 === 0) {
      await savePostureData(sessionRef.current, {
        postureScore: data.score,
        feedback: JSON.stringify(data.feedback),
        jointAngles: JSON.stringify(data.angles || {}),
      });
    }
  };

  const handleStartSession = async (exerciseType) => {
    const res = await startSession(exerciseType || "SITTING");
    sessionRef.current = res.data.sessionId;
    setActiveSession(res.data.sessionId);
    setScores([]);
    scoreAccum.current = [];
  };

  const handleStopSession = async () => {
    if (!sessionRef.current) return;
    const avg =
      scoreAccum.current.length > 0
        ? scoreAccum.current.reduce((a, b) => a + b, 0) / scoreAccum.current.length
        : 0;
    await stopSession(sessionRef.current, Math.round(avg), scoreAccum.current.length * 5);
    sessionRef.current = null;
    setActiveSession(null);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <span className="font-bold text-gray-800">PostureAI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hi, {user?.name}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Camera */}
        <div className="lg:col-span-2 space-y-6">
          <PoseCamera
            onSessionData={handlePostureData}
            onStart={handleStartSession}
            onStop={handleStopSession}
          />

          {/* Live score chart */}
          {scores.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="font-semibold text-gray-700 mb-4">Live posture trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={scores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="t" hide />
                  <YAxis domain={[0, 100]} width={30} />
                  <Tooltip formatter={(v) => [`${v}`, "Score"]} />
                  <Line
                    type="monotone" dataKey="score" stroke="#3b82f6"
                    dot={false} strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right: Stats + History */}
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-600 rounded-xl p-4 text-white">
              <div className="text-3xl font-bold">{summary.averageScore}</div>
              <div className="text-blue-100 text-xs mt-1">Avg score</div>
            </div>
            <div className="bg-teal-600 rounded-xl p-4 text-white">
              <div className="text-3xl font-bold">{summary.totalSessions}</div>
              <div className="text-teal-100 text-xs mt-1">Sessions</div>
            </div>
          </div>

          {/* Session history */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Session history</h3>
            {sessions.length === 0 ? (
              <p className="text-gray-400 text-sm">No sessions yet. Start your first one!</p>
            ) : (
              <ul className="space-y-2">
                {sessions.slice(0, 8).map((s) => (
                  <li key={s.sessionId}
                    className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="font-medium text-gray-700">
                        {s.exerciseType.charAt(0) + s.exerciseType.slice(1).toLowerCase()}
                      </span>
                      <div className="text-xs text-gray-400">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`font-bold ${
                      s.averageScore >= 80 ? "text-green-600" :
                      s.averageScore >= 60 ? "text-yellow-500" : "text-red-500"
                    }`}>
                      {Math.round(s.averageScore)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
