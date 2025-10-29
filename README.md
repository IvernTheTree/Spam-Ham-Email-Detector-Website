# AI4Cyber — Assignment 3 (Full‑Stack ML Web App)

A minimal, end‑to‑end web app: the user submits text in the **front end**, the **FastAPI** back end runs your **Assignment‑2 (A2)** pipeline and returns a prediction, and the front end visualises results with charts.

- **Front end:** React (Create React App, JavaScript) + MUI + Axios + Chart.js  
- **Back end:** FastAPI + Pydantic + joblib (loads your A2 artifacts)  
- **Python:** **3.12.7** (use this exact version for the backend)

> **Keep training–serving parity.** Use the same preprocessing and compatible library versions as A2 so `model.pkl` / `vectorizer.pkl` load reliably.

---

## 1) Repository layout (what goes where)

```
ai4cyber-a3/
├─ backend/
│  ├─ app/
│  │  └─ main.py            # FastAPI entrypoint
│  ├─ models/
│  │  ├─ vectorizer.pkl     # from A2
│  │  └─ model.pkl          # from A2
│  ├─ requirements.txt      # backend Python deps (see §3.2)
│  └─ .env.example
├─ frontend/
│  ├─ src/
│  │  ├─ pages/{Predict.js,Visualize.js,Batch.js}
│  │  ├─ api/client.js
│  │  └─ components/{ProbabilityDoughnut.js}
│  └─ .env.example
└─ README.md
```

---

## 2) Prerequisites

- **Python:** 3.12.7 (confirm with `py -3.12 --version` on Windows or `python3.12 --version` on macOS/Linux)  
- **Node.js:** 18 LTS or 20 LTS  
- **Artifacts from A2:** place `vectorizer.pkl` and `model.pkl` in `backend/models/`

*(Optional, best reproducibility): in your A2 venv, run `pip freeze > constraints-a2.txt` and later install A3 with `-c constraints-a2.txt`.*

---

## 3) Backend (FastAPI, Python 3.12.7)

### 3.1 Create & activate venv; install deps (inside `backend/`)

**Windows (PowerShell)**
```powershell
cd backend
py -3.12 --version                     # should print 3.12.7
py -3.12 -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
# Optional strict pin (if you exported A2 constraints):
# pip install -r requirements.txt -c constraints-a2.txt
```

**macOS / Linux**
```bash
cd backend
python3.12 --version                   # should print 3.12.7
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
# Optional strict pin:
# pip install -r requirements.txt -c constraints-a2.txt
```

### 3.2 `backend/requirements.txt`

This file contains the FastAPI web stack **plus** the A2 libraries you used (same `>=` style as A2).  
*(A copy is included with this README; place it at `backend/requirements.txt`.)*

```txt
# --- Web stack (A3 backend) ---
fastapi==0.115.4
uvicorn[standard]==0.30.6
pydantic==2.8.2
python-dotenv==1.0.1

# --- Your A2 libraries (same >= ranges as A2) ---
pandas>=2.0
numpy>=1.24
scikit-learn>=1.3
scipy>=1.10
matplotlib>=3.7
joblib>=1.3
beautifulsoup4>=4.12
lxml>=4.9
seaborn>=0.12
nltk>=3.8
```

### 3.3 Environment & run

Create `backend/.env` from the example:

```env
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000
MODEL_NAME=a2_spam_rf_tfidf
```

Run the API:
```bash
uvicorn app.main:app --reload --port 8000
```

Quick checks:
```bash
curl http://localhost:8000/health
curl http://localhost:8000/version
```

Smoke prediction:
```bash
curl -X POST http://localhost:8000/predict/spam \
 -H "Content-Type: application/json" \
 -d "{\"text\": \"Limited time offer, click here to win\"}"
```

---

## 4) Frontend (Create React App)

```bash
cd frontend
npx create-react-app .
npm i @mui/material @emotion/react @emotion/styled @mui/icons-material
npm i axios chart.js react-chartjs-2 react-router-dom
```

Create `frontend/.env`:
```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

Run:
```bash
npm start   # http://localhost:3000
```

*(Optional) dev proxy instead of `.env`: add to `frontend/package.json`)*
```json
"proxy": "http://localhost:8000"
```

---

## 5) API endpoints (Sprint‑1 baseline)

- **GET `/health`** → `{"status":"ok"}`  
- **GET `/version`** → `{"api":"1.0.0","model":"a2_spam_rf_tfidf"}`  
- **POST `/predict/spam`**  
  **Request**: `{"subject":"optional","text":"..."}`  
  **Response**:
  ```json
  {"label":"spam|ham","probability":0.0-1.0,"model":"...","elapsed_ms":45,"id":"req_..."}
  ```

*(Next sprints)*
- **GET `/metrics/spam`** → confusion matrix + ROC arrays  
- **POST `/predict/spam-batch`** → batch predictions

---

## 6) Visualisations (front end)

- **Doughnut (Chart.js):** spam vs ham probability (single prediction)  
- **Confusion matrix:** Chart.js matrix (or grouped bars)  
- **ROC:** Chart.js line (show AUC in subtitle)

---

## 7) Submission checklist (quick)

- Zip source (exclude `frontend/node_modules`), **include** `backend/models/*.pkl`  
- README (this), any docs/examples; minutes (PDF); contribution form (PDF)  
- Video (≤7 min): predict flow, charts, batch, responsiveness, `/docs`  
- Report (≤8 pages): architecture, FE/BE details, ≥4 APIs, error handling, limitations/future

**Done.** Place this README at repo root, and `requirements.txt` under `backend/`.
