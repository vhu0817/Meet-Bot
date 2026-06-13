# Summary eval harness

Scripts I use to check how good the meeting summaries actually are, and to
compare prompt versions before changing the one in `server/`. Pure Python,
separate from the app — running this doesn't touch the backend or Firestore.

## What it measures

- ROUGE-1/2/L on the executive summary vs a reference I wrote by hand
- BERTScore for semantic similarity (ROUGE alone punishes paraphrasing too hard)
- Action-item F1 — precision/recall vs the gold items, matched on owner + task with fuzzy string matching
- LLM-as-judge — a second Gemini call that scores faithfulness / completeness / hallucination 1–5

## Files

- `data/gold.json` — meetings + hand-written reference summaries/action items. Add more in the same shape.
- `prompts.py` — three prompt versions (v1 is the one currently shipped, v2/v3 are experiments)
- `summarizer.py` — calls Gemini, same prompt + JSON-cleanup logic as `server/src/services/gemini.js`
- `metrics.py` — the four metrics above
- `run_eval.py` — runs every prompt × every meeting, writes `results/results.csv`
- `evaluate.ipynb` — tables + charts

## Running

```bash
cd eval
pip install -r requirements.txt
python run_eval.py
```

`GEMINI_API_KEY` is read from the env, or pulled from `../server/.env` if it's
not set. Flags: `--no-bertscore` (skips the torch download, much faster),
`--no-judge`, `--versions v1_baseline v2_grounded`.

First BERTScore run downloads a model (~400MB). The judge adds one Gemini call
per summary so the script sleeps a bit between calls to avoid rate limits.
