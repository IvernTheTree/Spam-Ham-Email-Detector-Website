from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io, time
import os

app = FastAPI()


# Allow both localhost and 127.0.0.1 (React dev server uses either)
origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")


# CORS for localhost development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "FastAPI up"}

@app.post("/predict/spam-batch")
async def predict_spam_batch(file: UploadFile = File(...)):
    start = time.time()
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    # Headers: must have 'text' (allow 'subject' + 'text' if present)
    headers = df.columns.tolist()
    if "text" not in headers:
        raise HTTPException(status_code=400, detail="CSV must contain 'text' column")
    if len(df) > 500:
        raise HTTPException(status_code=400, detail="CSV cannot exceed 500 rows")

    results = []
    for i, row in df.iterrows():
        text = str(row.get("text", ""))
        if len(text) > 5000:
            results.append({
                "row": i + 1, "text": text[:50] + ("..." if len(text) > 50 else ""),
                "label": "error", "probability": None,
                "elapsed_ms": round((time.time() - start) * 1000, 2),
                "error": "Text exceeds 5000 characters"
            })
            continue
        # Dummy prediction — replace with Assignment 2 model
        label = "spam" if "buy" in text.lower() else "ham"
        prob = 0.9 if label == "spam" else 0.1

        results.append({
            "row": i + 1,
            "text": text[:50] + ("..." if len(text) > 50 else ""),
            "label": label,
            "probability": prob,
            "elapsed_ms": round((time.time() - start) * 1000, 2),
            "error": None
        })

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/version")
def version():
    return {
        "api": "1.0.0",
        "model": os.getenv("MODEL_NAME", "unknown")
    }

    return {"results": results}