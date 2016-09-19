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
  git push --force --quiet "https://${GH_TOKEN}@github.com/marionettejs/marionettejs.com.git" master:gh-pages > /dev/null 2>&1
else
  npm run lint && npm run test && npm run pagespeed
fi
