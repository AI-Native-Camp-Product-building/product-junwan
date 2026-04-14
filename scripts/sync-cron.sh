#!/bin/sh
# 매일 오전 9시(KST) 자동 동기화
# Docker 컨테이너 내에서 실행

SYNC_URL="http://localhost:1004/api/sync"
SYNC_SECRET="${SYNC_API_SECRET}"

echo "[$(date)] Starting sync..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SYNC_URL" \
  -H "Authorization: Bearer $SYNC_SECRET" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "[$(date)] HTTP $HTTP_CODE"
echo "$BODY"
