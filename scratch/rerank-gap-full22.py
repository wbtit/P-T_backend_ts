import json, torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

data = json.load(open("/tmp/gap_full22_pools.json"))
name = "BAAI/bge-reranker-v2-m3"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForSequenceClassification.from_pretrained(name, dtype=torch.float16).cuda()
model.eval()

results = []
for item in data:
    q = item["q"]
    cands = item["candidates"]
    valid = set(item["validIds"])
    pairs = [[q, c["text"][:2000]] for c in cands]
    scores = []
    with torch.no_grad():
        for i in range(0, len(pairs), 16):
            batch = pairs[i:i+16]
            inputs = tok(batch, padding=True, truncation=True, max_length=512, return_tensors="pt").to("cuda")
            logits = model(**inputs).logits.view(-1).float().cpu().tolist()
            scores.extend(logits)
    ranked = sorted(zip(cands, scores), key=lambda x: -x[1])
    rank1_c, rank1_s = ranked[0]
    rank2_c, rank2_s = ranked[1]
    gap = rank1_s - rank2_s
    rank1_valid = rank1_c["id"] in valid
    # also find best-rank-among-valid post rank
    post_rank = next((i+1 for i,(c,s) in enumerate(ranked) if c["id"] in valid), None)
    results.append({
        "id": item["id"], "rank1_score": rank1_s, "rank1_valid": rank1_valid,
        "rank1_page": rank1_c["pageStart"], "rank2_score": rank2_s, "rank2_page": rank2_c["pageStart"],
        "gap": gap, "post_rank": post_rank,
    })
    status = "PASS" if post_rank and post_rank <= 5 else "FAIL"
    r1 = "correct@1" if rank1_valid else "wrong@1"
    print(f"Q{item['id']:<3} gap={gap:>8.4f}  rank1={rank1_s:>8.4f}({r1},p{rank1_c['pageStart']}) rank2={rank2_s:>8.4f}(p{rank2_c['pageStart']})  postRank={post_rank}  gate={status}")

json.dump(results, open("/tmp/gap_full22_results.json", "w"), indent=2)
print("\nwrote /tmp/gap_full22_results.json")
