from __future__ import annotations

import os

import instructor
from openai import OpenAI


LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")
LLM_MODEL = os.getenv("LLM_MODEL", "gemma2:2b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "ollama")


def _build_openai_client() -> OpenAI:
    if LLM_PROVIDER != "ollama":
        raise ValueError(f"Unsupported LLM_PROVIDER: {LLM_PROVIDER}")
    return OpenAI(base_url=OLLAMA_BASE_URL, api_key=OLLAMA_API_KEY)


client = instructor.from_openai(_build_openai_client(), mode=instructor.Mode.JSON)
