"""Step 2: lazy-load-per-request cross-encoder reranking.

Loads bge-reranker-v2-m3 once (this load IS the lazy-load-per-request cost --
timed and reported, not hidden), reranks each question's candidate pool
(already produced by Step 1 / eval-step2-generate.ts), reports pre-rerank vs
post-rerank rank of the verified target page per question, then releases the
model and exits -- load, rerank, release, per the confirmed design.
"""
import json, time
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

IN = "/tmp/step2_candidates.json"
OUT = "/tmp/step2_reranked.json"
MAX_LEN = 512
BATCH = 16

t0 = time.time()
name = "BAAI/bge-reranker-v2-m3"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForSequenceClassification.from_pretrained(name, dtype=torch.float16).cuda()
model.eval()
load_time = time.time() - t0
print(f"[lazy-load] bge-reranker-v2-m3 loaded in {load_time:.2f}s")

data = json.load(open(IN))
results = []

for item in data:
    q = item["q"]
    cands = item["candidates"]
    pairs = [[q, c["text"][:2000]] for c in cands]  # char cap, tokenizer truncates to MAX_LEN anyway

    t1 = time.time()
    scores = []
    with torch.no_grad():
        for i in range(0, len(pairs), BATCH):
            batch = pairs[i:i + BATCH]
            inputs = tok(batch, padding=True, truncation=True, max_length=MAX_LEN, return_tensors="pt").to("cuda")
            logits = model(**inputs).logits.view(-1).float().cpu().tolist()
            scores.extend(logits)
    rerank_time = time.time() - t1

    ranked = sorted(zip(cands, scores), key=lambda x: -x[1])
    post_rank = None
    for i, (c, s) in enumerate(ranked):
        if c["pdfName"] == {"AISC": "AISC_Steel_construction_manual_fourteenth_edi.pdf",
                             "SJI": "43rd_Edition_Catalog_Final_With_Errata1and2.pdf",
                             "Hilti-EA": "Expansion_Anchor_(316-327)r021.pdf",
                             "ccd": "completeconnectiondetails-2.pdf"}[item["docKey"]] \
           and item["targetPage"] >= c["pageStart"] and item["targetPage"] <= c["pageEnd"]:
            post_rank = i + 1
            break

    results.append({
        "id": item["id"], "q": q, "docKey": item["docKey"], "targetPage": item["targetPage"],
        "poolSize": item["poolSize"], "preRerankRank": item["preRerankRank"],
        "postRerankRank": post_rank, "rerankTimeSec": round(rerank_time, 3),
        "nCandidatesReranked": len(cands),
    })
    print(f"[{item['id']}] pre={item['preRerankRank']}  post={post_rank}  "
          f"n={len(cands)}  rerank_time={rerank_time:.2f}s")

json.dump({"loadTimeSec": round(load_time, 2), "results": results}, open(OUT, "w"), indent=2)
print(f"\nwrote {OUT}")

avg_rerank = sum(r["rerankTimeSec"] for r in results) / len(results)
print(f"\nload_time={load_time:.2f}s  avg_rerank_time={avg_rerank:.2f}s  "
      f"implied per-request latency (load+rerank)={load_time+avg_rerank:.2f}s")
