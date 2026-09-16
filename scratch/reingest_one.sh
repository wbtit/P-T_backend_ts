#!/usr/bin/env bash
# Re-ingests one Phase 3b document through the real UPLOAD endpoint (commit=true),
# waits for completion, activates it, checks whether the old PENDING document in
# the same scope is left dangling (not auto-handled by activateStandardDocument(),
# which only supersedes ACTIVE peers -- confirmed this session via the AISC case),
# and verifies a real image URL for the new document.
#
# Usage: reingest_one.sh <OLD_DOC_ID> <FILE_PATH> <FAMILY_ID> <FAMILY_CODE> <EDITION>
set -uo pipefail

OLD_DOC_ID="$1"
FILE_PATH="$2"
FAMILY_ID="$3"
FAMILY_CODE="$4"
EDITION="$5"

BASE="http://localhost:5156/v1"
TOKEN=$(cat /tmp/claude-1000/-home-gpuserver1-P-T-backend-ts/b4aa2228-4013-4083-9a23-cd3bb1108c40/scratchpad/token.txt)

echo "=== Uploading: $FILE_PATH (family=$FAMILY_ID) ==="
UPLOAD_RESP=$(curl -s -X POST "$BASE/standards/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@${FILE_PATH}" \
  -F "sourceType=GENERAL" \
  -F "documentFamilyId=${FAMILY_ID}" \
  -F "familyCode=${FAMILY_CODE}" \
  -F "edition=${EDITION}" \
  -F "commit=true")
echo "$UPLOAD_RESP"
NEW_DOC_ID=$(echo "$UPLOAD_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['documentId'])")
echo "new documentId: $NEW_DOC_ID"

echo "=== Polling status ==="
for i in $(seq 1 120); do
  RESP=$(curl -s "$BASE/standards/documents/$NEW_DOC_ID" -H "Authorization: Bearer $TOKEN")
  STATUS=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['status'], d.get('processingStage'))")
  echo "[$i] $STATUS"
  if echo "$STATUS" | grep -qE "^(PENDING|FAILED) None$"; then
    echo "$RESP" > "/tmp/claude-1000/-home-gpuserver1-P-T-backend-ts/b4aa2228-4013-4083-9a23-cd3bb1108c40/scratchpad/status_${NEW_DOC_ID}.json"
    break
  fi
  sleep 5
done

FINAL_STATUS=$(python3 -c "import json; print(json.load(open('/tmp/claude-1000/-home-gpuserver1-P-T-backend-ts/b4aa2228-4013-4083-9a23-cd3bb1108c40/scratchpad/status_${NEW_DOC_ID}.json'))['status'])")
if [ "$FINAL_STATUS" != "PENDING" ]; then
  echo "*** INGESTION FAILED, status=$FINAL_STATUS -- STOPPING ***"
  cat "/tmp/claude-1000/-home-gpuserver1-P-T-backend-ts/b4aa2228-4013-4083-9a23-cd3bb1108c40/scratchpad/status_${NEW_DOC_ID}.json"
  exit 1
fi

echo "=== ingestReport summary ==="
python3 -c "
import json
d = json.load(open('/tmp/claude-1000/-home-gpuserver1-P-T-backend-ts/b4aa2228-4013-4083-9a23-cd3bb1108c40/scratchpad/status_${NEW_DOC_ID}.json'))
r = d.get('ingestReport') or {}
print('pages:', r.get('pages'), '| chunks:', r.get('chunks'), '| embedded:', r.get('embedded'), '| committed:', r.get('committed'))
"

echo "=== Activating $NEW_DOC_ID ==="
ACTIVATE_RESP=$(curl -s -X POST "$BASE/standards/documents/$NEW_DOC_ID/activate" -H "Authorization: Bearer $TOKEN")
echo "$ACTIVATE_RESP"

echo "=== Checking old doc ($OLD_DOC_ID) status post-activation ==="
OLD_STATUS_RESP=$(curl -s "$BASE/standards/documents/$OLD_DOC_ID" -H "Authorization: Bearer $TOKEN")
OLD_STATUS=$(echo "$OLD_STATUS_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['status'])")
echo "old doc status: $OLD_STATUS"
if [ "$OLD_STATUS" = "PENDING" ]; then
  echo "*** dangling PENDING confirmed (activateStandardDocument only supersedes ACTIVE peers) -- marking SUPERSEDED directly ***"
  npx ts-node scratch/mark_old_superseded.ts "$OLD_DOC_ID"
fi

echo "=== Image check (page 1) ==="
IMG_CODE=$(curl -s -o "/tmp/claude-1000/-home-gpuserver1-P-T-backend-ts/b4aa2228-4013-4083-9a23-cd3bb1108c40/scratchpad/img_${NEW_DOC_ID}.png" -w "%{http_code}" "$BASE/standards/image/$NEW_DOC_ID/1")
echo "HTTP $IMG_CODE"
file "/tmp/claude-1000/-home-gpuserver1-P-T-backend-ts/b4aa2228-4013-4083-9a23-cd3bb1108c40/scratchpad/img_${NEW_DOC_ID}.png"

echo "=== DONE: $NEW_DOC_ID ==="
