🏥 Patient Posture Monitoring System

AI-powered physiotherapy posture monitoring with real-time feedback using MediaPipe Pose detection, FastAPI backend, and React frontend.


📋 Table of Contents

Overview
Tech Stack
Project Structure
Prerequisites
Installation & Setup
Environment Variables
Running the Project
API Reference
Database Schema
Posture Analysis Logic
Default Credentials
Docker Deployment
Troubleshooting


Overview
A full-stack healthcare AI application that:

Detects body posture in real time using the webcam + MediaPipe Pose (runs in the browser)
Sends landmarks to the FastAPI backend for angle-based posture scoring
Provides live corrective feedback (e.g. "Keep shoulders level", "Straighten your spine")
Stores session history and progress in MySQL
Gives physiotherapists a dashboard to monitor all patients and view trends


Tech Stack
LayerTechnologyFrontendReact 18, Tailwind CSS, Recharts, MediaPipe Pose (JS)BackendPython 3.10+, FastAPI, SQLAlchemy, UvicornAuthJWT via python-jose, password hashing via passlib[bcrypt]DatabaseMySQL 8AI / CVMediaPipe Pose landmarks + angle-based joint analysisDeploymentDocker, Docker Compose

Project Structure
posture-monitor-py/
│
├── backend/
│   ├── main.py                  # FastAPI app entry — CORS, router registration
│   ├── database.py              # SQLAlchemy engine + get_db() dependency
│   ├── requirements.txt         # Python package dependencies
│   ├── .env.example             # Environment variable template
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py            # ORM models: User, Patient, PostureSession, PostureData
│   │
│   ├── routes/
│   │   ├── auth.py              # POST /api/auth/register  /api/auth/login
│   │   ├── sessions.py          # start, stop, save data, analyze, history
│   │   ├── analytics.py         # summary stats and trend data
│   │   └── physio.py            # physiotherapist-only patient management
│   │
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── auth.py              # JWT creation, decoding, get_current_user dependency
│   │
│   └── utils/
│       ├── __init__.py
│       └── posture.py           # Angle-based posture scoring for all exercise types
│
├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.js               # React Router setup + protected route wrapper
│       ├── index.js
│       ├── index.css            # Tailwind base styles
│       ├── hooks/
│       │   └── useAuth.js       # AuthContext: loginUser, logout, localStorage persistence
│       ├── services/
│       │   └── api.js           # Axios instance with JWT interceptor + all API calls
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── PatientDashboard.jsx
│       │   └── PhysioDashboard.jsx
│       └── components/
│           └── patient/
│               └── PoseCamera.jsx   # Webcam feed + MediaPipe + canvas skeleton overlay
│
├── db/
│   └── schema.sql               # MySQL table definitions + demo seed users
│
├── docker-compose.yml
└── README.md

Prerequisites
Make sure the following are installed before starting:
ToolMinimum VersionDownloadPython3.10https://python.orgpiplatestbundled with PythonNode.js18https://nodejs.orgMySQL8.0https://dev.mysql.comGitanyhttps://git-scm.com

Optional: Docker + Docker Compose for one-command deployment.


Installation & Setup
Step 1 — Clone the repository
bashgit clone https://github.com/your-username/posture-monitor-py.git
cd posture-monitor-py

Step 2 — Set up the MySQL database
Log into MySQL and run the schema:
bashmysql -u root -p < db/schema.sql
This creates the posture_monitor database, all four tables, and two demo seed users.

Step 3 — Configure backend environment
bashcd backend
cp .env.example .env
Edit .env with your values — see the Environment Variables section below.

Step 4 — Install Python dependencies
Using a virtual environment is recommended:
bashcd backend

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

# Install packages
pip install -r requirements.txt

Step 5 — Install frontend dependencies
bashcd frontend
npm install

Environment Variables
Create backend/.env based on .env.example:
envDB_URL=mysql+pymysql://root:yourpassword@localhost:3306/posture_monitor
JWT_SECRET=your-long-random-secret-key
JWT_EXPIRE_MINUTES=1440
CORS_ORIGIN=http://localhost:3000
VariableDescriptionDefaultDB_URLSQLAlchemy MySQL connection string—JWT_SECRETSecret used to sign JWT tokens (keep private)—JWT_EXPIRE_MINUTESToken lifetime in minutes1440 (24 h)CORS_ORIGINFrontend URL allowed by CORShttp://localhost:3000

Running the Project
1. Start the FastAPI backend
bashcd backend
source venv/bin/activate   # if using venv
uvicorn main:app --reload --port 8080
URLPurposehttp://localhost:8080API basehttp://localhost:8080/docsSwagger interactive docshttp://localhost:8080/redocReDoc documentation

2. Start the React frontend
Open a new terminal:
bashcd frontend
npm start
Frontend runs at http://localhost:3000

Both processes must be running simultaneously for the app to work.


API Reference
All routes are prefixed with /api. Protected routes require:
Authorization: Bearer <jwt_token>

Auth — /api/auth
MethodEndpointAuthDescriptionPOST/api/auth/register❌Create a new patient or physiotherapist accountPOST/api/auth/login❌Authenticate and receive a JWT token
Register body:
json{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "PATIENT",
  "age": 30,
  "gender": "MALE",
  "medical_condition": "Lower back pain"
}
Login body:
json{
  "email": "john@example.com",
  "password": "password123"
}
Response (both endpoints):
json{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "PATIENT"
}

Sessions — /api/sessions
MethodEndpointAuthDescriptionPOST/api/sessions/start✅Begin a new posture monitoring sessionPOST/api/sessions/{id}/stop✅Stop session and persist average scorePOST/api/sessions/{id}/data✅Save one posture data pointPOST/api/sessions/analyze✅Analyze MediaPipe landmarks → score + feedbackGET/api/sessions/my✅Fetch all sessions for the logged-in patientGET/api/sessions/{id}/data✅Fetch all data points for a session
Analyze request body:
json{
  "exercise_type": "SITTING",
  "landmarks": [
    { "x": 0.51, "y": 0.12, "z": -0.02, "visibility": 0.99 },
    { "x": 0.48, "y": 0.14, "z": -0.01, "visibility": 0.98 }
  ]
}
Analyze response:
json{
  "score": 72.5,
  "feedback": [
    "Keep shoulders level",
    "Avoid leaning your neck forward"
  ],
  "angles": {
    "neck_angle": 143.7,
    "shoulder_diff": 0.068
  }
}

Analytics — /api/analytics
MethodEndpointAuthDescriptionGET/api/analytics/summary✅Logged-in patient's average score and session countGET/api/analytics/patient/{id}/summary✅Any patient's summary (physiotherapist use)GET/api/analytics/patient/{id}/trend✅Last 10 session scores for a trend chart

Physiotherapist — /api/physio
These endpoints require role = PHYSIOTHERAPIST in the JWT.
MethodEndpointAuthDescriptionGET/api/physio/patients✅List all registered patientsGET/api/physio/patients/{id}/sessions✅View a specific patient's sessions

Database Schema
users
  id            BIGINT PK AUTO_INCREMENT
  name          VARCHAR(100)
  email         VARCHAR(150) UNIQUE
  password      VARCHAR(255)          ← bcrypt hash
  role          ENUM(PATIENT, PHYSIOTHERAPIST)
  created_at    TIMESTAMP

patients
  patient_id    BIGINT PK → users.id
  age           INT
  gender        ENUM(MALE, FEMALE, OTHER)
  medical_condition VARCHAR(255)
  assigned_physio_id BIGINT → users.id

posture_sessions
  session_id    BIGINT PK AUTO_INCREMENT
  patient_id    BIGINT → users.id
  exercise_type VARCHAR(50)
  average_score FLOAT
  duration      INT (seconds)
  notes         TEXT
  created_at    TIMESTAMP

posture_data
  id            BIGINT PK AUTO_INCREMENT
  session_id    BIGINT → posture_sessions.session_id
  ts            BIGINT (epoch milliseconds)
  posture_score FLOAT
  feedback      TEXT  (JSON array)
  joint_angles  TEXT  (JSON object)

Posture Analysis Logic
Analysis runs in backend/utils/posture.py using joint angle calculations on MediaPipe's 33-point body landmark model.
Supported exercise types
ExerciseChecks performedSITTINGNeck forward lean, shoulder level difference, spine vertical alignmentSTANDINGShoulder level, hip level, lateral spine leanSQUATKnee bend depth (angle), knee-ankle alignment (cave-in detection)PLANKShoulder → hip → knee straight-line angle, head neutral position
Scoring method
Start at 100 points
For each detected violation:
  → deduct a fixed penalty (10–25 points)
  → add a feedback message to the response
Final score = max(0, 100 - total_deductions)
Angle calculation (core formula)
pythondef calc_angle(a, b, c):
    """Angle in degrees at vertex B, given three (x, y) landmark dicts."""
    ba = (a["x"] - b["x"], a["y"] - b["y"])
    bc = (c["x"] - b["x"], c["y"] - b["y"])
    dot = ba[0]*bc[0] + ba[1]*bc[1]
    cos_val = dot / (hypot(*ba) * hypot(*bc))
    return degrees(acos(clamp(cos_val, -1, 1)))
Landmark index reference
0  = nose          7  = left_ear       8  = right_ear
11 = left_shoulder 12 = right_shoulder
23 = left_hip      24 = right_hip
25 = left_knee     26 = right_knee
27 = left_ankle    28 = right_ankle

Default Credentials
These accounts are created by db/schema.sql seed data:
RoleEmailPasswordPatientpatient@demo.compassword123Physiotherapistphysio@demo.compassword123

Docker Deployment
Ensure Docker and Docker Compose are installed, then run from the project root:
bashdocker-compose up --build
This spins up three containers:
ContainerPortDescriptiondb3306MySQL 8 with schema auto-appliedbackend8080FastAPI via Uvicornfrontend3000React app served by nginx
Stop everything:
bashdocker-compose down
Stop and delete database volume:
bashdocker-compose down -v

Troubleshooting
ModuleNotFoundError on backend start
bash# Ensure your virtual environment is active
source venv/bin/activate
pip install -r requirements.txt
Access denied MySQL error
Check DB_URL in your .env file.
Make sure the MySQL user has access to the posture_monitor database.
CORS error in browser console
Ensure CORS_ORIGIN in .env matches your frontend URL exactly.
Example: http://localhost:3000   (no trailing slash)
Webcam not detected
Browsers require HTTPS for camera access on non-localhost origins.
For local development, http://localhost:3000 works without HTTPS.
Grant camera permission when the browser prompts.
MediaPipe does not detect pose
Make sure you are well lit and visible in the camera frame.
The model needs at least the upper body in frame for sitting/standing exercises.
FastAPI returns 422 Unprocessable Entity
Your request body does not match the expected schema.
Open http://localhost:8080/docs to test endpoints interactively with Swagger UI.
Port already in use
bash# Kill whatever is on port 8080
lsof -ti:8080 | xargs kill    # macOS / Linux
netstat -ano | findstr :8080   # Windows — then taskkill /PID <pid> /F
