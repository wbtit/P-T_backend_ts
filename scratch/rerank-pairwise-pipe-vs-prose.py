import json, torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

data = json.load(open("/tmp/pipe_vs_prose_probe.json"))
name = "BAAI/bge-reranker-v2-m3"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForSequenceClassification.from_pretrained(name, dtype=torch.float16).cuda()
model.eval()

pairs = []
for t in data:
    pairs.append([t["q"], t["pipeText"][:2000]])
    pairs.append([t["q"], t["proseText"][:2000]])

scores = []
with torch.no_grad():
    for i in range(0, len(pairs), 16):
        batch = pairs[i:i+16]
        inputs = tok(batch, padding=True, truncation=True, max_length=512, return_tensors="pt").to("cuda")
        logits = model(**inputs).logits.view(-1).float().cpu().tolist()
        scores.extend(logits)

print(f"{'target':<20} {'pipe score':>12} {'prose score':>12} {'winner':>8}")
all_prose_wins = True
for i, t in enumerate(data):
    pipe_s = scores[2*i]
    prose_s = scores[2*i+1]
    winner = "prose" if prose_s > pipe_s else "pipe"
    if winner == "pipe":
        all_prose_wins = False
    print(f"{t['note']:<20} {pipe_s:>12.4f} {prose_s:>12.4f} {winner:>8}")

print(f"\nAll targets won by prose: {all_prose_wins}")
