# Phase 11: Multi-Page Image Answers

## 1. Response Shape & Top N Decision
Instead of composing a prose answer, the system will directly present the user with a curated shortlist of the most relevant manual pages as images. 
- **N = 3.** 
- **Justification:** Benchmark numbers demonstrate a massive +18.2% absolute jump in recall moving from Rank 1 (29.4%) to Rank 3 (47.6%), but only a minor +4.8% gain from Rank 3 to Rank 5 (52.4%). Expanding to N=5 requires 67% more reading for only a quarter of the benefit. N=3 strikes the perfect balance between high recall and low cognitive load.
- **Output:** The response payload will contain an array of up to 3 candidate pages. Each candidate will include its own distinct citation (page numbers, PDF name) and the actual rendered page image(s).

## 2. LLM Generation
- **Decision:** **Removed entirely.**
- **Justification:** Trained detailers can parse technical drawings and tabular data significantly faster and more accurately than an LLM can describe them. Furthermore, eliminating the LLM generation step bypasses the 30-40s CPU wait time per query, offering the single largest latency reduction possible on the current hardware. 

## 3. The Floor
- The `0.60` acceptance threshold strictly dictates **WHETHER** the system returns an answer.
- **Semantics:** If the top-ranked hit (`Rank 1`) clears the `0.60` acceptance threshold, the system returns the top N candidates for that source *regardless* of whether candidates 2 and 3 individually clear the score. 
- If the top hit does *not* clear the threshold, the system returns a graceful "not covered by this standard" (empty array) instead of attempting to return any candidate pages. 
- **Tradeoff Note:** This guarantees that Ranks 2 and 3 may occasionally be weak hits, which is acceptable since the detailer is scanning real manual pages instead of trusting an LLM hallucination based on weak hits.

## 4. Persistence & Schema Update
Existing `StandardChatAnswer` rows hold real chat history protected by Phase 1's `Restrict` guards. We must preserve this audit trail.
- **Additive Approach:** Existing rows and their scalar citation columns (`citationPdfName`, `citationPageStart`, `imagePaths`, etc.) will remain completely readable and unmodified. 
- We will introduce a new `StandardChatCitation` model with a many-to-one relationship to `StandardChatAnswer`.
- Any drop or repurposing of legacy columns must be explicitly flagged and approved BEFORE execution. 
- **History Endpoint Logic:** The history endpoint will seamlessly read both formats. If a `StandardChatAnswer` has related `StandardChatCitation` records, it renders the new multi-page format. If not, it falls back to parsing the legacy scalar columns to render old chat history.

```prisma
model StandardChatCitation {
  id                String             @id @default(uuid()) @db.Uuid
  answerId          String             @map("answer_id") @db.Uuid
  chunkType         StandardChunkType  
  citationPdfName   String             
  citationPageStart Int                
  citationPageEnd   Int                
  anchorPageStart   Int?               
  anchorPageEnd     Int?               
  imagePaths        String[]           
  rank              Int

  answer StandardChatAnswer @relation(fields: [answerId], references: [id], onDelete: Cascade)
}
```

## 5. Anchor Chunks
- Anchor chunks (the parent heading page context) will travel alongside their respective hits within the new array structure. 
- **Display logic:** They remain distinctly labelled so the detailer understands the relationship between the two images provided for that specific hit. The `imagePaths` array inside each citation object maintains the `[targetImage, anchorImage]` contract.

## 6. API Contract
The endpoint path is `/v1/projects/:projectId/standards/chat`. It will return a modified response shape for successful hits:

```json
{
  "answers": [
    {
      "sourceType": "FABRICATOR",
      "pinnedDocumentId": "uuid",
      "citations": [
        {
          "rank": 1,
          "chunkType": "VISUAL",
          "pdfName": "MM Detailing Standards - Struct Steel v5.0.pdf",
          "pageStart": 10,
          "pageEnd": 10,
          "anchorPageStart": null,
          "anchorPageEnd": null,
          "imageUrls": ["/files/manual_10.png"]
        },
        {
          "rank": 2,
          ...
        }
      ]
    }
  ]
}
```
*Note: `answerText` will be omitted from the payload.*

## 7. Success Metrics
Moving forward, any retrieval changes must be judged on both of these metrics jointly, never recall alone.
- **Recall@3:** Maximizing the presence of the correct manual page within the 3-image shortlist.
- **Confident-Wrong Rate:** The proportion of accepted queries whose shortlist contains *no correct page*. 
  - **Baseline:** With 83.3% overall acceptance and 47.6% Recall@3, our baseline Confident-Wrong Rate currently stands at **42.9%**.
  - **Formula:** `(Acceptance Rate - Recall@N) / Acceptance Rate` => `(83.3% - 47.6%) / 83.3% = 42.85%`.
  - **Note:** This metric is strictly tied to N. If N is ever changed from 3, this baseline must be recomputed. 
