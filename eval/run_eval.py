"""Run the full evaluation: every prompt version x every gold meeting,
scored on ROUGE, BERTScore, action-item F1, and LLM-as-judge.

Usage:
    cd eval
    pip install -r requirements.txt
    export GEMINI_API_KEY=...        # or rely on server/.env
    python run_eval.py               # writes results/results.csv
"""
import os
import json
import time
import argparse

import pandas as pd

from prompts import PROMPTS
from summarizer import summarize
import metrics


def _load_env_from_server():
    """Fall back to server/.env so you don't have to re-export the key."""
    if os.environ.get("GEMINI_API_KEY"):
        return
    env_path = os.path.join(os.path.dirname(__file__), "..", "server", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("GEMINI_API_KEY=") and "=" in line:
                    os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip().strip('"')


def load_gold():
    path = os.path.join(os.path.dirname(__file__), "data", "gold.json")
    with open(path) as f:
        return json.load(f)


def evaluate(prompt_versions=None, use_bertscore=True, use_judge=True):
    _load_env_from_server()
    gold = load_gold()
    versions = prompt_versions or list(PROMPTS.keys())

    rows = []
    for version in versions:
        system_prompt = PROMPTS[version]
        for meeting in gold:
            print(f"→ {version} | {meeting['id']}")
            try:
                generated = summarize(meeting["transcript"], system_prompt)
            except Exception as e:
                print(f"   summarize failed: {e}")
                continue

            ref = meeting["reference"]
            row = {"prompt_version": version, "meeting_id": meeting["id"]}

            row.update(rouge_prefixed(metrics.rouge_scores(
                generated.get("executive_summary", ""), ref["executive_summary"]
            )))

            if use_bertscore:
                try:
                    row["bertscore_f1"] = metrics.bertscore(
                        generated.get("executive_summary", ""), ref["executive_summary"]
                    )
                except ImportError:
                    print("   bert_score not installed — skipping (pip install bert-score, or use --no-bertscore)")
                    use_bertscore = False

            f1 = metrics.action_item_f1(generated.get("action_items"), ref.get("action_items"))
            row["ai_precision"] = f1["precision"]
            row["ai_recall"] = f1["recall"]
            row["ai_f1"] = f1["f1"]

            if use_judge:
                verdict = metrics.llm_judge(meeting["transcript"], generated)
                row["judge_faithfulness"] = verdict.get("faithfulness")
                row["judge_completeness"] = verdict.get("completeness")
                row["judge_hallucination_free"] = verdict.get("hallucination_free")

            rows.append(row)
            time.sleep(2)  # light pacing on top of retry/backoff to ease rate limits

    return pd.DataFrame(rows)


def rouge_prefixed(d):
    return {f"{k}": v for k, v in d.items()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-bertscore", action="store_true", help="skip BERTScore (faster)")
    ap.add_argument("--no-judge", action="store_true", help="skip the LLM-as-judge pass")
    ap.add_argument("--versions", nargs="*", help="subset of prompt versions to run")
    args = ap.parse_args()

    df = evaluate(
        prompt_versions=args.versions,
        use_bertscore=not args.no_bertscore,
        use_judge=not args.no_judge,
    )

    out_dir = os.path.join(os.path.dirname(__file__), "results")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "results.csv")
    df.to_csv(out_path, index=False)

    print(f"\nSaved {len(df)} rows to {out_path}\n")
    if not df.empty:
        print("Mean scores by prompt version:")
        numeric = df.select_dtypes("number").columns
        print(df.groupby("prompt_version")[numeric].mean().round(3).to_string())


if __name__ == "__main__":
    main()
