# 🏥 Patient Posture Monitoring System

AI-powered physiotherapy posture monitoring with real-time feedback using MediaPipe Pose detection.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Recharts, MediaPipe Pose |
| Backend | Java 17, Spring Boot 3, Spring Security, JWT |
| Database | MySQL 8 |
| AI Service | Python 3.10, MediaPipe, Flask |

---

## Project Structure

```
posture-monitor/
├── frontend/          # React app
├── backend/           # Spring Boot API
├── python-service/    # Pose analysis microservice
├── db/                # SQL schema
└── docker-compose.yml
```

---

## Quick Start

### 1. Database
```bash
mysql -u root -p < db/schema.sql
```

### 2. Backend
```bash
cd backend
# Update src/main/resources/application.properties with your DB credentials
mvn spring-boot:run
# Runs on http://localhost:8080
```

### 3. Python Microservice
```bash
cd python-service
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

### 4. Frontend
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

---

## Default Credentials (after DB seed)
- Patient: patient@demo.com / password123
- Physio: physio@demo.com / password123

---

## API Base URL
`http://localhost:8080/api`

---

## Docker (optional)
```bash
docker-compose up --build
```
