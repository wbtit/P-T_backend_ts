"""Rerank the corrected candidate pools, best-rank-among-valid-ids scoring."""
import json, time
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

IN = "/tmp/corrected_pools.json"
OUT = "/tmp/corrected_reranked.json"
MAX_LEN = 512
BATCH = 16

t0 = time.time()
name = "BAAI/bge-reranker-v2-m3"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForSequenceClassification.from_pretrained(name, dtype=torch.float16).cuda()
model.eval()
print(f"[lazy-load] {time.time()-t0:.2f}s")

data = json.load(open(IN))
results = []

for item in data:
    q = item["q"]
    cands = item["candidates"]
    valid = set(item["validIds"])
    pairs = [[q, c["text"][:2000]] for c in cands]

    t1 = time.time()
    scores = []
    with torch.no_grad():
        for i in range(0, len(pairs), BATCH):
            batch = pairs[i:i+BATCH]
            inputs = tok(batch, padding=True, truncation=True, max_length=MAX_LEN, return_tensors="pt").to("cuda")
            logits = model(**inputs).logits.view(-1).float().cpu().tolist()
            scores.extend(logits)
    rerank_time = time.time() - t1

    ranked = sorted(zip(cands, scores), key=lambda x: -x[1])
    post_rank = None
    for i, (c, s) in enumerate(ranked):
        if c["id"] in valid:
            post_rank = i + 1
            break

    results.append({
        "id": item["id"], "q": q, "preRank": item["preRank"],
        "postRank": post_rank, "poolSize": item["poolSize"],
        "burialRank": item.get("burialRank"), "burialTotal": item.get("burialTotal"),
        "rerankTimeSec": round(rerank_time, 3),
    })
    print(f"[{item['id']}] pre={item['preRank']}  post={post_rank}  time={rerank_time:.2f}s")

json.dump({"loadTimeSec": round(time.time()-t0, 2), "results": results}, open(OUT, "w"), indent=2)
print(f"\nwrote {OUT}")
