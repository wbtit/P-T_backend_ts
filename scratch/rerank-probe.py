"""Pairwise probe: rerank Q6's pool, identify the top format-mismatched
competitor(s) beating the target, then score target-vs-competitor pairs
directly against bge-reranker-v2-m3 to confirm format bias (not query-blind
preference for any table, and not a relevance judgment error)."""
import json, torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

data = json.load(open("/tmp/q6_probe_pool.json"))
q = data["q"]
target_id = data["targetId"]
cands = data["candidates"]

name = "BAAI/bge-reranker-v2-m3"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForSequenceClassification.from_pretrained(name, dtype=torch.float16).cuda()
model.eval()

pairs = [[q, c["text"][:2000]] for c in cands]
scores = []
with torch.no_grad():
    for i in range(0, len(pairs), 16):
        batch = pairs[i:i+16]
        inputs = tok(batch, padding=True, truncation=True, max_length=512, return_tensors="pt").to("cuda")
        logits = model(**inputs).logits.view(-1).float().cpu().tolist()
        scores.extend(logits)

ranked = sorted(zip(cands, scores), key=lambda x: -x[1])
target_rank = next(i for i,(c,s) in enumerate(ranked) if c["id"]==target_id) + 1
print(f"target post-rerank rank: {target_rank}")
print("\ntop 10 post-rerank:")
for i,(c,s) in enumerate(ranked[:10]):
    marker = " <-- TARGET" if c["id"]==target_id else ""
    print(f"  {i+1}. score={s:.4f} page={c['pageStart']} type={c['chunkType']} text[:80]={c['text'][:80]!r}{marker}")

# pairwise: target vs its top beaters, target text swapped for a "clean" restatement
target_text = next(c["text"] for c in cands if c["id"]==target_id)
beaters = [c for c,s in ranked[:target_rank-1]]
print(f"\n=== pairwise scores: query vs target, and query vs each beater above it ===")
target_pair = [[q, target_text[:2000]]]
inputs = tok(target_pair, padding=True, truncation=True, max_length=512, return_tensors="pt").to("cuda")
target_score = model(**inputs).logits.view(-1).float().item()
print(f"target alone: {target_score:.4f}")
for b in beaters:
    print(f"  beater page={b['pageStart']} type={b['chunkType']} score={next(s for c,s in zip(cands,scores) if c['id']==b['id']):.4f} text[:150]={b['text'][:150]!r}")
