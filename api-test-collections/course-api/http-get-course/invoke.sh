#!/bin/sh
set -eu

base_url="${API_BASE_URL:-http://127.0.0.1:8000}"
course_id="${COURSE_ID:-calculus-101}"
curl -i "${base_url}/api/courses/${course_id}"