#!/bin/bash
set -o pipefail

npm i && \
git submodule update --init --recursive
