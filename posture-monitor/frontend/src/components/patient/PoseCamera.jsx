import React, { useRef, useEffect, useState, useCallback } from "react";
import axios from "axios";

const EXERCISE_OPTIONS = ["SITTING", "STANDING", "SQUAT", "PLANK"];

const SCORE_COLOR = (score) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
};

export default function PoseCamera({ onSessionData, onStart, onStop }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [isRunning, setIsRunning] = useState(false);
  const [exerciseType, setExerciseType] = useState("SITTING");
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState("");

  // Send landmarks to Python microservice
  const analyzeLandmarks = useCallback(async (landmarks) => {
    try {
      const res = await axios.post("http://localhost:5000/analyze", {
        exerciseType,
        landmarks: landmarks.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
      });
      const { score: s, feedback: fb, angles } = res.data;
      setScore(s);
      setFeedback(fb);
      // Pass data up to parent for session saving
      if (onSessionData) onSessionData({ score: s, feedback: fb, angles });
    } catch {
      // If python service isn't running, use simple client-side fallback
      setScore(75);
      setFeedback(["Python service not reachable — using fallback mode"]);
    }
  }, [exerciseType, onSessionData]);

  // Draw skeleton on canvas
  const drawSkeleton = useCallback((landmarks, connections) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // Draw connections
    ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
    ctx.lineWidth = 2;
    connections.forEach(([i, j]) => {
      const a = landmarks[i];
      const b = landmarks[j];
      if (!a || !b || a.visibility < 0.5 || b.visibility < 0.5) return;
      ctx.beginPath();
      ctx.moveTo(a.x * width, a.y * height);
      ctx.lineTo(b.x * width, b.y * height);
      ctx.stroke();
    });

    // Draw joints
    landmarks.forEach((lm) => {
      if (lm.visibility < 0.5) return;
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
      ctx.fill();
    });
  }, []);

  // Load MediaPipe Pose
  useEffect(() => {
    let pose;

    const loadPose = async () => {
      try {
        const { Pose, POSE_CONNECTIONS } = await import("@mediapipe/pose");

        pose = new Pose({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((results) => {
          if (!results.poseLandmarks) return;
          drawSkeleton(results.poseLandmarks, POSE_CONNECTIONS);
          analyzeLandmarks(results.poseLandmarks);
        });

        poseRef.current = { pose, POSE_CONNECTIONS };
      } catch (e) {
        setError("MediaPipe failed to load. Ensure @mediapipe/pose is installed.");
      }
    };

    loadPose();
    return () => { if (pose) pose.close(); };
  }, [drawSkeleton, analyzeLandmarks]);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setIsRunning(true);
      if (onStart) onStart(exerciseType);

      // Send frames to pose model every 200ms
      intervalRef.current = setInterval(() => {
        if (poseRef.current && videoRef.current.readyState === 4) {
          poseRef.current.pose.send({ image: videoRef.current });
        }
      }, 200);
    } catch {
      setError("Could not access webcam. Please grant camera permission.");
    }
  };

  const stopCamera = () => {
    clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsRunning(false);
    if (onStop) onStop();
    setScore(null);
    setFeedback([]);
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Live Pose Detection</h2>
        <select
          value={exerciseType}
          onChange={(e) => setExerciseType(e.target.value)}
          disabled={isRunning}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {EXERCISE_OPTIONS.map((ex) => (
            <option key={ex} value={ex}>{ex.charAt(0) + ex.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2 mb-4">{error}</div>
      )}

      {/* Webcam + skeleton canvas */}
      <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video mb-4">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={640} height={480} />
        {!isRunning && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm opacity-60">
            Camera is off
          </div>
        )}
      </div>

      {/* Score display */}
      {score !== null && (
        <div className="flex items-center gap-6 mb-4">
          <div className="text-center">
            <div className={`text-5xl font-bold ${SCORE_COLOR(score)}`}>{Math.round(score)}</div>
            <div className="text-xs text-gray-500 mt-1">Posture score</div>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${score}%`,
                  backgroundColor: score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
            <div className="mt-3 space-y-1">
              {feedback.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-yellow-500 mt-0.5">⚠</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <button
        onClick={isRunning ? stopCamera : startCamera}
        className={`w-full py-2.5 rounded-lg font-medium transition ${
          isRunning
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isRunning ? "Stop session" : "Start session"}
      </button>
    </div>
  );
}
