"""Evaluation metrics for meeting summaries.

Four complementary signals:
  - ROUGE-1/2/L : lexical overlap of the executive summary vs reference.
  - BERTScore   : semantic similarity (catches paraphrases ROUGE misses).
  - Action-item F1 : precision/recall of extracted action items vs gold,
                     matched fuzzily on owner + task.
  - LLM-as-judge : a separate Gemini call scoring faithfulness, completeness,
                   and hallucination on a 1-5 rubric.
"""
import os
import re
import json
from difflib import SequenceMatcher

from rouge_score import rouge_scorer

_rouge = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)


# ── ROUGE ────────────────────────────────────────────────────────────
def rouge_scores(generated_summary, reference_summary):
    scores = _rouge.score(reference_summary, generated_summary)
    return {k: round(v.fmeasure, 4) for k, v in scores.items()}


# ── BERTScore ────────────────────────────────────────────────────────
# Imported lazily — it pulls in torch/transformers, which are heavy.
def bertscore(generated_summary, reference_summary):
    from bert_score import score as _bs

    _, _, f1 = _bs([generated_summary], [reference_summary], lang="en", rescale_with_baseline=True)
    return round(float(f1[0]), 4)


# ── Action-item F1 ───────────────────────────────────────────────────
def _norm(s):
    return re.sub(r"\s+", " ", str(s or "").lower().strip())


def _similar(a, b):
    return SequenceMatcher(None, _norm(a), _norm(b)).ratio()


def _items_match(pred, gold, threshold=0.5):
    """A predicted item matches a gold item if the owner agrees (or is close)
    and the task text is sufficiently similar."""
    owner_ok = _similar(pred.get("owner"), gold.get("owner")) >= 0.6
    task_sim = _similar(pred.get("task"), gold.get("task"))
    return owner_ok and task_sim >= threshold


def action_item_f1(predicted_items, gold_items, threshold=0.5):
    predicted_items = predicted_items or []
    gold_items = gold_items or []

    if not gold_items and not predicted_items:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0, "tp": 0, "fp": 0, "fn": 0}

    matched_gold = set()
    tp = 0
    for pred in predicted_items:
        for gi, gold in enumerate(gold_items):
            if gi in matched_gold:
                continue
            if _items_match(pred, gold, threshold):
                tp += 1
                matched_gold.add(gi)
                break

    fp = len(predicted_items) - tp
    fn = len(gold_items) - len(matched_gold)

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "tp": tp,
        "fp": fp,
        "fn": fn,
    }


# ── LLM-as-judge ─────────────────────────────────────────────────────
JUDGE_PROMPT = """You are a strict evaluator of meeting summaries. You are given the
original TRANSCRIPT and a candidate SUMMARY. Score the summary on three axes from 1 to 5:

- faithfulness: Are all claims in the summary supported by the transcript? (5 = fully grounded, 1 = mostly fabricated)
- completeness: Does the summary capture the important decisions and action items? (5 = nothing important missed)
- hallucination_free: Is the summary free of invented people, decisions, or deadlines? (5 = nothing invented, 1 = many inventions)

Return ONLY raw JSON: {"faithfulness": int, "completeness": int, "hallucination_free": int, "notes": "one sentence"}"""


def _extract_json(text):
    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    if not cleaned.startswith("{"):
        s, e = cleaned.find("{"), cleaned.rfind("}")
        if s != -1 and e != -1:
            cleaned = cleaned[s : e + 1]
    return json.loads(cleaned)


def llm_judge(transcript, generated_summary, model_name=None):
    import google.generativeai as genai

    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(model_name or os.environ.get("EVAL_GEMINI_MODEL", "gemini-2.5-flash"))

    transcript_text = "\n".join(
        f"[{l['time']}] {l['speaker']}: {l['text']}" for l in transcript
    )
    summary_text = json.dumps(generated_summary, indent=2)
    prompt = f"{JUDGE_PROMPT}\n\nTRANSCRIPT:\n{transcript_text}\n\nSUMMARY:\n{summary_text}"

    resp = model.generate_content(prompt)
    try:
        verdict = _extract_json(resp.text)
    except Exception:
        return {"faithfulness": None, "completeness": None, "hallucination_free": None, "notes": "judge parse failed"}

    for k in ("faithfulness", "completeness", "hallucination_free"):
        verdict[k] = verdict.get(k)
    return verdict
