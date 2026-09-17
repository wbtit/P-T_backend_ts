import json, torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

data = json.load(open("/tmp/rewrite_test2_pools.json"))
name = "BAAI/bge-reranker-v2-m3"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForSequenceClassification.from_pretrained(name, dtype=torch.float16).cuda()
model.eval()

def postrank(query_text, candidates, valid_ids):
    pairs = [[query_text, c["text"][:2000]] for c in candidates]
    scores = []
    with torch.no_grad():
        for i in range(0, len(pairs), 16):
            batch = pairs[i:i+16]
            inputs = tok(batch, padding=True, truncation=True, max_length=512, return_tensors="pt").to("cuda")
            logits = model(**inputs).logits.view(-1).float().cpu().tolist()
            scores.extend(logits)
    ranked = sorted(zip(candidates, scores), key=lambda x: -x[1])
    for i, (c, s) in enumerate(ranked):
        if c["id"] in valid_ids:
            return i + 1
    return None

results = []
print(f"{'label':<25} {'orig':<8} {'awkward':<10} {'bestRewrite':<12}")
for item in data:
    valid = set(item["validIds"])
    orig_post = postrank(item["original"]["q"], item["original"]["pool"], valid)
    awk_post = postrank(item["awkward"]["q"], item["awkward"]["pool"], valid)
    rw_post = postrank(item["bestRewrite"]["q"], item["bestRewrite"]["pool"], valid)
    print(f"{item['label']:<25} {str(orig_post):<8} {str(awk_post):<10} {str(rw_post):<12}")
    results.append({"label": item["label"], "orig_post": orig_post, "awk_post": awk_post, "bestRewrite_post": rw_post,
                     "bestRewriteText": item["bestRewrite"]["q"], "awkwardText": item["awkward"]["q"]})

json.dump(results, open("/tmp/rewrite_test2_postrank_results.json", "w"), indent=2)
print("\nwrote /tmp/rewrite_test2_postrank_results.json")
