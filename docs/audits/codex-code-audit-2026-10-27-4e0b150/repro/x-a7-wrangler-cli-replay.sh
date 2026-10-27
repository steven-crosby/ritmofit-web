#!/usr/bin/env bash
# Challenge reviewer (audit 2026-10-27 @ 4e0b150) — disposable A-7 replay through the real
# `wrangler d1 migrations apply --local` CLI path (not the cloudflare:test helper).
# Local Miniflare D1 only: scratch config, fake database_id, --local + --persist-to a scratch dir.
# Usage: x-a7-wrangler-cli-replay.sh <worktree-root> <stop-before-migration-prefix> <scratch-dir>
#   e.g. x-a7-wrangler-cli-replay.sh /tmp/wt-x 0018 /tmp/x-a7-0018
set -euo pipefail
WT=$1; TARGET=$2; DIR=$3
W="$WT/apps/api/node_modules/.bin/wrangler"
rm -rf "$DIR"; mkdir -p "$DIR/migrations"; cd "$DIR"
cat > wrangler.toml <<'EOF'
name = "x-a7-local-only"
main = "w.js"
compatibility_date = "2024-11-06"
[[d1_databases]]
binding = "DB"
database_name = "xa7"
database_id = "00000000-0000-0000-0000-000000000000"
migrations_dir = "migrations"
EOF
echo 'export default {fetch(){return new Response("x")}}' > w.js
for f in "$WT"/apps/api/migrations/0*.sql; do
  base=$(basename "$f"); [[ "$base" < "$TARGET" ]] && cp "$f" migrations/
done
q() { "$W" d1 execute xa7 --local --persist-to ./state --json --command "$1" 2>/dev/null; }
"$W" d1 migrations apply xa7 --local --persist-to ./state >/dev/null 2>&1
echo "applied through: $(ls migrations | tail -1)"
now=1700000000000
q "INSERT INTO users (id,email,created_at,updated_at) VALUES ('u1','x@example.test',$now,$now);
   INSERT INTO classes (id,owner_user_id,title,created_at,updated_at) VALUES ('c1','u1','C',$now,$now);
   INSERT INTO tracks (id,owner_user_id,title,artist,created_at,updated_at) VALUES ('t1','u1','T','A',$now,$now);
   INSERT INTO class_tracks (id,class_id,track_id,position,created_at,updated_at) VALUES ('ct1','c1','t1',0,$now,$now);
   INSERT INTO cues (id,class_track_id,anchor_ms,text,created_at,updated_at) VALUES ('q1','ct1',1000,'Climb',$now,$now);
   INSERT INTO class_track_moves (id,class_track_id,anchor_ms,name_override,created_at,updated_at) VALUES ('m1','ct1',1500,'Sprint',$now,$now);" >/dev/null
counts() { q "SELECT (SELECT count(*) FROM classes) classes,(SELECT count(*) FROM class_tracks) class_tracks,(SELECT count(*) FROM cues) cues,(SELECT count(*) FROM class_track_moves) moves" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['results'][0])"; }
echo "before: $(counts)"
cp "$WT"/apps/api/migrations/${TARGET}_*.sql migrations/
set +e; out=$("$W" d1 migrations apply xa7 --local --persist-to ./state 2>&1); rc=$?; set -e
echo "apply ${TARGET} exit=$rc $(echo "$out" | grep -E '✅|❌|ERROR' | head -2 | tr -s ' ')"
echo "after:  $(counts)"
