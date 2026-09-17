import json, torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

data = json.load(open("/tmp/q6_probe_pool_prose.json"))
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
target_score = next(s for c,s in zip(cands,scores) if c["id"]==target_id)
print(f"target post-rerank rank (prose-rendered): {target_rank}")
print(f"target score: {target_score:.4f}  (was -2.3438 raw grid)")
print("\ntop 10 post-rerank:")
for i,(c,s) in enumerate(ranked[:10]):
    marker = " <-- TARGET" if c["id"]==target_id else ""
    print(f"  {i+1}. score={s:.4f} page={c['pageStart']} type={c['chunkType']} text[:80]={c['text'][:80]!r}{marker}")
