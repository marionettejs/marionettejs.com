#!/bin/bash
set -o pipefail

bower i && \
npm run compile-all && \
cp CNAME dist
cd dist && \
git init && \
git add . && \
git commit -m "deploy" && \
git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" master:gh-pages > /dev/null 2>&1
