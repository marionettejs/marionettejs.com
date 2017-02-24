#!/bin/bash
set -o pipefail

yarn install && \
git submodule update --init --recursive
