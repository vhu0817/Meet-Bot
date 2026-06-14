"""Shared Gemini call helper with retry/backoff for free-tier rate limits.

The free tier allows ~5 requests/min, and the eval fires many calls in a row,
so we retry on 429 (ResourceExhausted), honoring the server's suggested delay.
"""
import re
import time

MAX_RETRIES = 6


def generate_with_retry(model, prompt):
    last_err = None
    for attempt in range(MAX_RETRIES):
        try:
            return model.generate_content(prompt)
        except Exception as e:  # noqa: BLE001 — SDK raises provider-specific types
            msg = str(e)
            is_rate_limit = "429" in msg or "ResourceExhausted" in msg or "quota" in msg.lower()
            if not is_rate_limit or attempt == MAX_RETRIES - 1:
                last_err = e
                if not is_rate_limit:
                    raise
                break
            # Prefer the server's "retry in Ns" hint; fall back to backoff.
            m = re.search(r"retry[_ ]delay.*?(\d+)", msg, re.DOTALL | re.IGNORECASE)
            wait = int(m.group(1)) + 2 if m else min(60, 8 * (attempt + 1))
            print(f"   rate limited, waiting {wait}s (attempt {attempt + 1}/{MAX_RETRIES})…")
            time.sleep(wait)
    raise last_err
