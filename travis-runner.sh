#!/bin/bash
set -o pipefail

if [ "$TRAVIS_BRANCH" = "master" ];
then
  bower i && \
  npm run compile-all && \
  cp CNAME dist
  cd dist && \
  git init && \
  git add . && \
  git commit -m "deploy" && \
  git push --force --quiet "https://${GH_TOKEN}@github.com/marionettejs/marionettejs.com.git" master:gh-pages > /dev/null 2>&1
else
  npm run lint
fi
