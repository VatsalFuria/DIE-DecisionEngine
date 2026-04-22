# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ingest, scoring, audit

app = FastAPI(
    title="Decision Intelligence Engine",
    version="0.1.0",
    description="Hybrid AI/Deterministic MCDA system.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # Next.js dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(scoring.router)
app.include_router(audit.router)