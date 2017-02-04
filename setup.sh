#!/bin/bash
set -o pipefail

yarn i && \
git submodule update --init --recursive
