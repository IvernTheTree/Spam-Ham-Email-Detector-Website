# AI4Cyber — Assignment 3 (Full-Stack ML Web App)

A minimal end-to-end app: the **React** front end sends text to a **FastAPI** backend, which runs your **Assignment-2 (A2)** model and returns a prediction. The UI visualises results (Chart.js doughnut) and handles errors cleanly.

- **Front end:** React (CRA, JS) · MUI · Axios · Chart.js  
- **Back end:** FastAPI · Pydantic · joblib (loads A2 artifacts)  
- **Python:** **3.12.7** (use this exact version for backend)

> **Training–serving parity:** keep preprocessing and compatible `scikit-learn/joblib` versions between A2 training and A3 serving.

---

## Contents
1. [Repository layout](#repository-layout)
2. [Prerequisites](#prerequisites)
3. [Quick start](#quick-start)
4. [Modes: Stub vs Real Artifacts](#modes-stub-vs-real-artifacts)
5. [API (baseline)](#api-baseline)
6. [Verify & test](#verify--test)
7. [Troubleshooting](#troubleshooting)
8. [Submission checklist](#submission-checklist)

---

## Repository layout

ai4cyber-a3/
├─ backend/
│ ├─ app/main.py # FastAPI app (health, version, predict endpoints)
│ ├─ models/ # A2 artifacts go here
│ │ ├─ vectorizer.pkl # (spam) from A2
│ │ └─ model.pkl # (spam) from A2
│ │ ├─ malware_logreg_cv.joblib #  pipeline
│ │ └─ malware_feature_columns.json #  ordered feature list
│ ├─ requirements.txt
│ └─ .env.example
├─ frontend/
│ ├─ src/
│ │ ├─ pages/Predict.js
│ │ ├─ components/ProbabilityDoughnut.js
│ │ ├─ components/HeroTitle.js
│ │ └─ api/client.js
│ └─ package.json
└─ README.md

yaml
Copy code

---

## Prerequisites
- **Python** 3.12.7  
- **Node.js** 18/20 LTS and **npm** 9+
- (Optional) Your A2 training scripts to regenerate artifacts

---

## Quick start

### 1) Backend
```bash
cd backend
python -m venv .venv
# Windows:  .\.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
Create backend/.env:

env
Copy code
CORS_ORIGINS=http://localhost:3000
MODEL_NAME=a2_spam_rf_tfidf
MODEL_STUB=1                 # 1 = stub mode (no artifacts needed), 0 = real model
MAX_TEXT_LEN=5000
MAX_REQUEST_BYTES=65536

# Only used when MODEL_STUB=0
SPAM_VEC_PATH=models/vectorizer.pkl
SPAM_MODEL_PATH=models/model.pkl
MALWARE_PIPE_PATH=models/malware_logreg_cv.joblib
MALWARE_FEATURES_PATH=models/malware_feature_columns.json
Run:

bash
Copy code
uvicorn app.main:app --reload --port 8000
# Swagger: http://localhost:8000/docs
2) Frontend
bash
Copy code
cd frontend
npm install
npm start
# open http://localhost:3000
Paste some text and click Detect Spam.

Modes: Stub vs Real Artifacts
Stub (default, fastest)
MODEL_STUB=1 in .env

Backend returns heuristic probabilities → perfect for wiring up and demoing error handling.

Real artifacts (A2)
Generate from your A2 scripts (names may vary):

bash
Copy code
python spam_random_forest.py
python malware_logistic_regression.py
Copy outputs into backend/models/ (or update paths in .env).

Set MODEL_STUB=0 and restart Uvicorn.

GET /health should show "stub": false and "spam_available": true (and malware if provided).

API (baseline)
Method	Path	Purpose
GET	/health	Service + model readiness
GET	/version	API version, model name, stub
POST	/predict/spam	Spam probability + label
POST	/predict/malware	(optional) requires real pipeline

Spam request

bash
Copy code
curl -s -X POST http://localhost:8000/predict/spam \
  -H "Content-Type: application/json" \
  -d '{"subject": null, "text": "win a FREE prize click here"}'
Example success

json
Copy code
{
  "label": "spam",
  "probability": 0.91,
  "model": "a2_spam_rf_tfidf",
  "elapsed_ms": 34,
  "id": "req_6f1c2a9b"
}
Verify & test
Health/Version

bash
Copy code
curl -s http://localhost:8000/health
curl -s http://localhost:8000/version
Predict (good / error cases)

Valid text → chip + doughnut in UI

Empty text → FE blocks; BE would return 422 VALIDATION_ERROR

Oversize body → 413 (payload guard)

Stop backend → UI shows friendly Network Error

Troubleshooting
Network Error (frontend): backend not running on :8000 or wrong baseURL.

CORS in browser: set CORS_ORIGINS=http://localhost:3000 and restart backend.

MODEL_NOT_LOADED (500): you set MODEL_STUB=0 but artifacts missing or incompatible. Restore MODEL_STUB=1 or fix paths/versions.

Different sklearn versions: ensure training and serving use compatible versions (pin in requirements.txt).