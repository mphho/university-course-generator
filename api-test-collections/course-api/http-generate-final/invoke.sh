#!/bin/sh
set -eu

base_url="${API_BASE_URL:-http://127.0.0.1:8000}"
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
curl -i -X POST "${base_url}/api/courses/calculus-101/finals/generate" \
  -H "Content-Type: application/json" \
  --data-binary "@${script_dir}/sample-data.json"