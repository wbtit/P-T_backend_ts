/**
 * Cross-encoder reranking for standards retrieval.
 *
 * ============================ PORTABILITY CONTRACT ============================
 * The CURRENT configuration is DEV/TEST ONLY:
 *   provider = "local-onnx"  (@xenova/transformers, ONNX Runtime, CPU)
 *   model    = "Xenova/bge-reranker-base"  (278M)
 *   reason   = the dev box has NO GPU and no Python ML stack, and the originally
 *              intended model (BAAI/bge-reranker-v2-m3) publishes no ONNX weights.
 *
 * Production is expected to move to a GPU-served cross-encoder (likely
 * bge-reranker-v2-m3 or successor) behind an HTTP endpoint. When that happens,
 * add a provider implementing RerankProvider and select it with
 * STANDARDS_RERANKER_PROVIDER — nothing else in the pipeline should need to change.
 *
 * >>> Latency and quality numbers measured on this CPU/ONNX path DO NOT represent
 * >>> production performance. Do not use them for production capacity planning.
 * >>> See tests/RERANKER_NOTES.md for the measurements and their caveats.
 * =============================================================================
 */

export interface RerankProvider {
  readonly name: string;
  /** Returns one relevance score per passage, higher = more relevant. Same order as input. */
  score(query: string, passages: string[]): Promise<number[]>;
}

export interface RerankerConfig {
  enabled: boolean;
  provider: string;
  model: string;
  /** Token budget for the (query, passage) PAIR. 256 is the measured floor — see notes. */
  maxLength: number;
  /** How many first-stage candidates to rerank. */
  candidates: number;
}

const envBool = (v: string | undefined, d: boolean) => (v === undefined ? d : /^(1|true|yes|on)$/i.test(v));
const envInt = (v: string | undefined, d: number) => { const n = parseInt(v || "", 10); return Number.isFinite(n) ? n : d; };

export const rerankerConfig: RerankerConfig = {
  // DEFAULT OFF. Phase 2 validation (2026-09-01) showed reranking fixes citation accuracy but
  // converts safe refusals into confidently-wrong numeric answers on dense tables, because
  // table-row read accuracy is the real bottleneck. It must stay disabled in any environment a
  // domain expert or real user touches until table extraction quality is fixed (Phase 1).
  //
  // ENABLED as of 2026-09-02 in THIS dev/test environment's .env (STANDARDS_RERANKER_ENABLED=true)
  // for continued side-by-side testing while Phase 1 (table extraction fix) is in progress. This
  // is a per-environment override, not a change to the shipped default below — any NEW or OTHER
  // environment still gets OFF unless someone explicitly opts in there too. See tests/RERANKER_NOTES.md.
  enabled: envBool(process.env.STANDARDS_RERANKER_ENABLED, false),
  provider: process.env.STANDARDS_RERANKER_PROVIDER || "local-onnx",
  model: process.env.STANDARDS_RERANKER_MODEL || "Xenova/bge-reranker-base",
  maxLength: envInt(process.env.STANDARDS_RERANKER_MAX_LENGTH, 256),
  candidates: envInt(process.env.STANDARDS_RERANKER_CANDIDATES, 20),
};

/** DEV/TEST provider: ONNX Runtime via @xenova/transformers (already a project dependency). */
class LocalOnnxReranker implements RerankProvider {
  readonly name = "local-onnx";
  private tokenizer: any = null;
  private model: any = null;
  private loading: Promise<void> | null = null;

  private async load(): Promise<void> {
    if (this.tokenizer && this.model) return;
    if (!this.loading) {
      this.loading = (async () => {
        const t0 = Date.now();
        const { env, AutoTokenizer, AutoModelForSequenceClassification } = await import("@xenova/transformers");
        (env as any).allowLocalModels = false;
        this.tokenizer = await AutoTokenizer.from_pretrained(rerankerConfig.model);
        this.model = await AutoModelForSequenceClassification.from_pretrained(rerankerConfig.model, { quantized: true });
        console.log(`[Reranker] loaded ${rerankerConfig.model} (onnx/cpu) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      })().catch(err => { this.loading = null; throw err; });
    }
    await this.loading;
  }

  async score(query: string, passages: string[]): Promise<number[]> {
    await this.load();
    const inputs = this.tokenizer(Array(passages.length).fill(query), {
      text_pair: passages, padding: true, truncation: true, max_length: rerankerConfig.maxLength,
    });
    const { logits } = await this.model(inputs);
    return Array.from(logits.data as Float32Array | number[], Number);
  }
}

const providers: Record<string, RerankProvider> = { "local-onnx": new LocalOnnxReranker() };

export function getRerankProvider(): RerankProvider {
  const p = providers[rerankerConfig.provider];
  if (!p) throw new Error(`[Reranker] unknown provider "${rerankerConfig.provider}"`);
  return p;
}

export function shouldRerank(): boolean {
  return rerankerConfig.enabled;
}

/**
 * Rerank `items` by cross-encoder relevance to `query`, returning a new array,
 * most-relevant first. FAIL-OPEN: on any error the original order is returned
 * unchanged, so a reranker outage degrades to first-stage ranking rather than
 * breaking the tier.
 */
export async function rerank<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  label = ""
): Promise<{ items: T[]; reranked: boolean; ms: number; scores?: number[] }> {
  const t0 = Date.now();
  if (items.length <= 1) return { items, reranked: false, ms: 0 };
  const window = items.slice(0, rerankerConfig.candidates);
  const tail = items.slice(rerankerConfig.candidates);
  try {
    const scores = await getRerankProvider().score(query, window.map(getText));
    const order = window.map((item, i) => ({ item, s: scores[i] })).sort((a, b) => b.s - a.s);
    const ms = Date.now() - t0;
    console.log(`[Reranker] ${label} reranked ${window.length} candidates in ${ms}ms (${rerankerConfig.model}, max_len=${rerankerConfig.maxLength})`);
    return { items: [...order.map(o => o.item), ...tail], reranked: true, ms, scores: order.map(o => o.s) };
  } catch (err: any) {
    console.warn(`[Reranker] ${label} FAILED (${err.message}); falling back to first-stage order`);
    return { items, reranked: false, ms: Date.now() - t0 };
  }
}
