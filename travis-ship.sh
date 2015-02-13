#!/bin/bash
set -o pipefail

touch foo.txt;
git add .;
git commit -m "wow";

git push --force --quiet "https://${GH_TOKEN}@github.com/marionettejs/marionettejs.com.git" master:foo > /dev/null 2>&1
