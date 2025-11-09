from __future__ import annotations

import os
import time
import uuid
import json
import logging
from pathlib import Path
from typing import Dict, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# ---------------- Env / Config ----------------
load_dotenv()  # reads backend/.env if present

API_VERSION = "1.0.0"

# CORS
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

# Model flags & names
MODEL_NAME = os.getenv("MODEL_NAME", "email_logreg_char3-5")
STUB_MODE = os.getenv("MODEL_STUB", "0") == "1"
THRESHOLD = float(os.getenv("THRESHOLD", "0.50"))  # decision threshold for spam label

# Artifact paths (override via .env)
#  ⬇️ Defaults align with your Logistic Regression + char TF‑IDF artifacts
MODEL_DIR = Path(os.getenv("MODEL_DIR", Path(__file__).resolve().parent.parent / "models"))
SPAM_VEC_PATH = MODEL_DIR / os.getenv("SPAM_VEC_PATH", "email_tfidf_char_3_5.joblib")
SPAM_MODEL_PATH = MODEL_DIR / os.getenv("SPAM_MODEL_PATH", "email_logreg_balanced.joblib")

# (Optional) Malware pipeline + feature order
MALWARE_PIPE_PATH = MODEL_DIR / os.getenv("MALWARE_PIPE_PATH", "malware_logreg_cv.joblib")
MALWARE_FEATURES_PATH = MODEL_DIR / os.getenv("MALWARE_FEATURES_PATH", "malware_feature_columns.json")

# Limits
MAX_REQUEST_BYTES = int(os.getenv("MAX_REQUEST_BYTES", "65536"))  # ~64KB
MAX_TEXT_LEN = int(os.getenv("MAX_TEXT_LEN", "5000"))

# ---------------- App & Logger ----------------
app = FastAPI(title="AI4Cyber A3 API", version=API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("api")

# ---------------- Pydantic I/O ----------------
class SpamPredictIn(BaseModel):
    subject: str | None = Field(default=None, max_length=200)
    text: str = Field(min_length=1, max_length=MAX_TEXT_LEN)

class PredictOut(BaseModel):
    label: Literal["spam", "ham"]
    probability: float
    model: str
    elapsed_ms: int
    id: str

class MalwarePredictIn(BaseModel):
    # Send a dict of feature_name -> numeric value
    features: Dict[str, float]

class MalwarePredictOut(BaseModel):
    label: int              # 0 = benign, 1 = malware
    probability: float      # P(malware)
    model: str
    elapsed_ms: int
    id: str

# ---------------- Global state ----------------
VEC = None            # spam vectorizer (separate)
CLF = None            # spam classifier  (separate)
MAL_PIPE = None       # malware sklearn Pipeline
MAL_FEATURE_COLS = None  # ordered list of feature names (for malware)

MODEL_LOADED = False
MODEL_WARMED = False

# ---------------- Utilities ----------------
def error_envelope(code: str, request_id: str, details=None):
    payload = {"error": code, "request_id": request_id}
    if details is not None:
        payload["details"] = details
    return payload

async def check_content_length(request: Request):
    cl = request.headers.get("content-length")
    if cl and int(cl) > MAX_REQUEST_BYTES:
        rid = getattr(request.state, "request_id", "n/a")
        # Use 413 and consistent envelope via HTTPException handler
        raise HTTPException(status_code=413, detail=f"PAYLOAD_TOO_LARGE: {cl}>{MAX_REQUEST_BYTES}")

# Optional: mirror A2 preprocessing (adjust if you had custom steps)
def preprocess_txt(s: str) -> str:
    return s.lower()

# ---------------- Middleware ----------------
@app.middleware("http")
async def add_request_id_and_logging(request: Request, call_next):
    request_id = f"req_{uuid.uuid4().hex[:8]}"
    request.state.request_id = request_id
    t0 = time.perf_counter()
    try:
        response = await call_next(request)
    except HTTPException as he:
        logger.exception(f"{request.method} {request.url.path} -> {he.status_code} id={request_id}")
        return JSONResponse(
            status_code=he.status_code,
            content=error_envelope("HTTP_ERROR" if he.status_code < 500 else "INTERNAL", request_id, details=str(he.detail)),
        )
    except Exception as e:
        logger.exception(f"{request.method} {request.url.path} -> 500 id={request_id}")
        return JSONResponse(status_code=500, content=error_envelope("INTERNAL", request_id, details=str(e)))
    finally:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        try:
            status = response.status_code
        except Exception:
            status = "ERR"
        logger.info(f"{request.method} {request.url.path} -> {status} {elapsed_ms}ms id={request_id}")

    response.headers["X-Request-ID"] = request_id
    return response

# ---------------- Exception Handlers ----------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    rid = getattr(request.state, "request_id", "n/a")
    details = []
    for err in exc.errors():
        loc = ".".join(map(str, err.get("loc", [])))
        details.append({"field": loc, "msg": err.get("msg")})
    return JSONResponse(status_code=422, content=error_envelope("VALIDATION_ERROR", rid, details=details))

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    rid = getattr(request.state, "request_id", "n/a")
    detail = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
    return JSONResponse(
        status_code=exc.status_code,
        content=error_envelope("HTTP_ERROR" if exc.status_code < 500 else "INTERNAL", rid, details=detail),
    )

# ---------------- Startup: load artifacts ----------------
@app.on_event("startup")
def load_models():
    """Load spam TF‑IDF + LogReg (separate files) and optional malware Pipeline.
       Falls back to STUB mode if nothing loads successfully.
    """
    global VEC, CLF, MAL_PIPE, MAL_FEATURE_COLS, MODEL_LOADED, MODEL_WARMED, STUB_MODE

    if STUB_MODE:
        MODEL_LOADED = False
        MODEL_WARMED = True
        logger.info("Starting API in STUB mode.")
        return

    try:
        loaded_any = False

        # Load spam artifacts (separate vectorizer + classifier)
        if SPAM_VEC_PATH.exists() and SPAM_MODEL_PATH.exists():
            import joblib
            VEC = joblib.load(SPAM_VEC_PATH)
            CLF = joblib.load(SPAM_MODEL_PATH)
            # warm-up
            _ = CLF.predict_proba(VEC.transform(["warm up"]))
            loaded_any = True
            logger.info(f"Loaded spam model: vec={SPAM_VEC_PATH.name}, clf={SPAM_MODEL_PATH.name}")
        else:
            if not SPAM_VEC_PATH.exists():
                logger.warning(f"Spam vectorizer missing: {SPAM_VEC_PATH}")
            if not SPAM_MODEL_PATH.exists():
                logger.warning(f"Spam model missing: {SPAM_MODEL_PATH}")

        # Load malware pipeline + feature order JSON (optional)
        if MALWARE_PIPE_PATH.exists() and MALWARE_FEATURES_PATH.exists():
            import joblib
            import numpy as np
            MAL_PIPE = joblib.load(MALWARE_PIPE_PATH)
            with open(MALWARE_FEATURES_PATH, "r", encoding="utf-8") as f:
                MAL_FEATURE_COLS = json.load(f)
            # warm-up with a zero vector matching features length
            _ = MAL_PIPE.predict_proba(np.zeros((1, len(MAL_FEATURE_COLS))))
            loaded_any = True
            logger.info("Loaded malware pipeline + feature columns.")

        MODEL_LOADED = loaded_any
        MODEL_WARMED = True

        if not loaded_any:
            STUB_MODE = True
            logger.warning("No artifacts found; falling back to STUB mode.")

    except Exception as e:
        STUB_MODE = True
        MODEL_LOADED = False
        MODEL_WARMED = True
        logger.exception(f"Model load failed; falling back to STUB mode: {e}")

# ---------------- Helpers ----------------
def _prob_spam(text: str) -> float:
    """Return P(spam) using the loaded model, or stub if not available.
    Selects the correct probability column via classes_.
    """
    if STUB_MODE:
        # simple keyword stub for wiring
        tokens = {"free", "win", "click", "offer", "prize", "urgent", "limited", "claim", "now"}
        hits = sum(w in text.lower() for w in tokens)
        return min(0.98, 0.10 + 0.18 * hits)

    if VEC is None or CLF is None:
        raise HTTPException(status_code=500, detail="SPAM_MODEL_NOT_LOADED")

    X = VEC.transform([preprocess_txt(text)])  # use the exact TF‑IDF fitted in training (char 3–5)
    probas = CLF.predict_proba(X)[0]
    classes = list(getattr(CLF, "classes_", [0, 1]))

    # Robustly choose the spam column
    if "spam" in classes:
        spam_idx = classes.index("spam")
    elif 1 in classes:
        spam_idx = classes.index(1)  # binary 0/1 with 1=spam
    else:
        spam_idx = 1  # sensible default for binary classifiers

    return float(probas[spam_idx])

# ---------------- Routes ----------------
@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs", "endpoints": ["/health", "/version", "/predict/spam"]}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": MODEL_LOADED,
        "warmed_up": MODEL_WARMED,
        "stub": STUB_MODE,
        "threshold": THRESHOLD,
        "spam_available": bool(VEC and CLF),
        "malware_available": bool(MAL_PIPE and MAL_FEATURE_COLS),
    }

@app.get("/version")
def version():
    return {"api": API_VERSION, "model": MODEL_NAME, "stub": STUB_MODE, "threshold": THRESHOLD}

@app.post("/predict/spam", response_model=PredictOut, dependencies=[Depends(check_content_length)])
def predict_spam(payload: SpamPredictIn, request: Request):
    # enforce extra guard (defense-in-depth)
    if len(payload.text) > MAX_TEXT_LEN:
        raise HTTPException(status_code=413, detail=f"TEXT_TOO_LONG: {len(payload.text)}>{MAX_TEXT_LEN}")

    t0 = time.perf_counter()
    p = _prob_spam(payload.text)
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    rid = getattr(request.state, "request_id", f"req_{uuid.uuid4().hex[:8]}")
    label = "spam" if p >= THRESHOLD else "ham"
    return PredictOut(label=label, probability=p, model=MODEL_NAME, elapsed_ms=elapsed_ms, id=rid)

@app.post("/predict/malware", response_model=MalwarePredictOut, dependencies=[Depends(check_content_length)])
def predict_malware(payload: MalwarePredictIn, request: Request):
    if STUB_MODE:
        # For safety, keep malware disabled in stub (or implement a trivial rule if desired)
        raise HTTPException(status_code=503, detail="MALWARE_MODEL_STUB_DISABLED")

    if MAL_PIPE is None or MAL_FEATURE_COLS is None:
        raise HTTPException(status_code=500, detail="MALWARE_MODEL_NOT_LOADED")

    # Reorder incoming dict to match training column order
    try:
        row = [float(payload.features[k]) for k in MAL_FEATURE_COLS]
    except KeyError as missing:
        raise HTTPException(status_code=400, detail={"message": f"Missing feature: {missing}"})
    except ValueError as ve:
        raise HTTPException(status_code=400, detail={"message": f"Non-numeric feature: {ve}"})

    import numpy as np
    arr = np.array(row, dtype=float).reshape(1, -1)

    t0 = time.perf_counter()
    try:
        proba = float(MAL_PIPE.predict_proba(arr)[0, 1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MALWARE_INFERENCE_ERROR: {e}")
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    rid = getattr(request.state, "request_id", f"req_{uuid.uuid4().hex[:8]}")
    label = 1 if proba >= THRESHOLD else 0
    return MalwarePredictOut(label=label, probability=proba, model=MODEL_NAME, elapsed_ms=elapsed_ms, id=rid)

@app.get("/debug/model-info")
def model_info():
    info = {
        "vec_path": str(SPAM_VEC_PATH),
        "clf_path": str(SPAM_MODEL_PATH),
        "classes_": list(getattr(CLF, "classes_", [])) if CLF is not None else None,
        "stub": STUB_MODE,
        "threshold": THRESHOLD,
    }
    return json.loads(json.dumps(info, default=str))
