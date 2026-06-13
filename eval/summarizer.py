"""Wraps the Gemini call so the eval measures the same summarization the app does.
Mirrors the prompt-building and JSON-cleanup logic from
server/src/services/gemini.js, but in Python so it slots into the harness.
"""
import os
import re
import json
import google.generativeai as genai

MODEL_NAME = os.environ.get("EVAL_GEMINI_MODEL", "gemini-2.5-flash")

_configured = False


def _ensure_configured():
    global _configured
    if _configured:
        return
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY not set. Export it (or copy server/.env) before running the eval."
        )
    genai.configure(api_key=api_key)
    _configured = True


def _format_transcript(transcript):
    return "\n".join(f"[{l['time']}] {l['speaker']}: {l['text']}" for l in transcript)


def _extract_json(text):
    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    if not cleaned.startswith("{"):
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start != -1 and end != -1:
            cleaned = cleaned[start : end + 1]
    return json.loads(cleaned)


def summarize(transcript, system_prompt, model_name=MODEL_NAME):
    """Run one summarization. Returns the parsed summary dict."""
    _ensure_configured()
    model = genai.GenerativeModel(model_name)
    prompt = f"{system_prompt}\n\nHere is the meeting transcript:\n\n{_format_transcript(transcript)}"
    resp = model.generate_content(prompt)
    summary = _extract_json(resp.text)
    summary.setdefault("executive_summary", "")
    summary.setdefault("key_decisions", [])
    summary.setdefault("action_items", [])
    summary.setdefault("participants_detected", [])
    summary.setdefault("sentiment", "neutral")
    return summary
