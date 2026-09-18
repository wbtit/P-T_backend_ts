"""
Phase 5 §1.4 -- reranker HTTP service (bge-reranker-v2-m3).

Lazy-load-per-request: load, rerank, release -- Phase 4's own validated
design (Implementation.md line 69: "GPU, lazy-load-per-request"), sketched in
Phase 5 spec §1.4, now actually running as a real service instead of a
disposable batch probe (scratch/rerank.py). Freshly measured on this machine
before this file was written: 4.29s cold load (weights cached on disk),
~1.14GB VRAM while loaded, clean release back to ~0GB.

Single-request-only for Phase 5 -- confirmed decision, not an oversight (see
Phase 5 spec §1.4). `http.server.HTTPServer` is single-threaded by
construction, so it serializes requests without any explicit lock; a second
request arriving mid-rerank simply waits for the socket to accept it, rather
than contending for the same GPU memory mid-load. Concurrency handling
(a real request queue, or threading with a GPU-access lock) is explicitly a
Phase 8 (production hardening) item, not built here.

Protocol, matching the pattern already used for Ollama elsewhere in this
project (a local HTTP endpoint, JSON in/out):
  POST /rerank   {"query": str, "candidates": [{"id": str, "text": str}]}
              -> {"scores": [{"id": str, "score": float}]}, same order as input
  GET  /health -> {"status": "ok"}  (cheap liveness check, does not load the model)

Run: python3 server.py [--port 8008]
(uses the same benchmark-env interpreter that already has torch/transformers,
same as every rerank scratch probe this project has run so far)
"""
import argparse
import gc
import json
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

MODEL_NAME = "BAAI/bge-reranker-v2-m3"
MAX_LEN = 512
BATCH = 16
DEFAULT_PORT = 8008


def _load_model():
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    tok = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, torch_dtype=dtype).to(device)
    model.eval()
    return tok, model


def _release(model, tok):
    """Real release, not just `del` -- a bare `del model; torch.cuda.empty_cache()`
    measurably failed to return memory between requests in this same
    long-running process (confirmed: VRAM held by this process grew request
    over request, unlike the standalone scratch probe, which exits entirely
    after one load -- the difference is exactly a persistent process, and
    del()'s refcount drop alone was not enough to release CUDA memory to the
    allocator's free pool here). `gc.collect()` before `empty_cache()` is the
    fix that matters -- a reference held somewhere in the model's internal
    graph/hooks otherwise survives past the `del` until the next real garbage
    collection cycle, and `empty_cache()` only returns memory PyTorch's
    allocator already considers free."""
    import torch

    del model
    del tok
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def _score(tok, model, query, candidates):
    import torch

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    pairs = [[query, c["text"][:2000]] for c in candidates]  # char cap; tokenizer truncates to MAX_LEN anyway
    scores = []
    with torch.no_grad():
        for i in range(0, len(pairs), BATCH):
            batch = pairs[i:i + BATCH]
            inputs = tok(batch, padding=True, truncation=True, max_length=MAX_LEN, return_tensors="pt").to(device)
            logits = model(**inputs).logits.view(-1).float().cpu().tolist()
            scores.extend(logits)
    return scores


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"status": "ok"})
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/rerank":
            self._send_json(404, {"error": "not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)
            payload = json.loads(raw)
            query = payload["query"]
            candidates = payload["candidates"]
            if not isinstance(candidates, list) or not candidates:
                self._send_json(400, {"error": "candidates must be a non-empty array"})
                return
            if not all(isinstance(c, dict) and "id" in c and "text" in c for c in candidates):
                self._send_json(400, {"error": "each candidate must have 'id' and 'text'"})
                return
        except Exception as e:
            self._send_json(400, {"error": f"bad request: {e}"})
            return

        import torch

        t0 = time.time()
        tok, model = _load_model()
        load_time = time.time() - t0

        t1 = time.time()
        try:
            scores = _score(tok, model, query, candidates)
        except Exception as e:
            _release(model, tok)
            self._send_json(500, {"error": f"rerank failed: {e}"})
            return
        infer_time = time.time() - t1

        mem_before_release = torch.cuda.memory_allocated()
        _release(model, tok)
        mem_after_release = torch.cuda.memory_allocated()

        print(f"[reranker] load={load_time:.2f}s infer={infer_time:.3f}s n={len(candidates)} "
              f"vram_before_release={mem_before_release/1e9:.3f}GB vram_after_release={mem_after_release/1e9:.3f}GB",
              flush=True)

        result = [{"id": c["id"], "score": s} for c, s in zip(candidates, scores)]
        self._send_json(200, {"scores": result})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()
    server = HTTPServer(("127.0.0.1", args.port), Handler)
    print(f"[reranker] listening on 127.0.0.1:{args.port} (single-request-only, Phase 5)")
    server.serve_forever()


if __name__ == "__main__":
    main()
