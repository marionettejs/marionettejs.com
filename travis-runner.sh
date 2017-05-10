#!/bin/bash -e
set -o pipefail

echo "$TRAVIS_BRANCH"

if [ "$TRAVIS_BRANCH" = "master" ] && [ "$TRAVIS_PULL_REQUEST" = "false" ]
then
  echo "Deploying!"
  bower i
  npm run compile-all
  cp CNAME dist
  cd dist
  git init
  git add .
  git commit -m "deploy"
else
  npm run lint && npm run pagespeed
fi
