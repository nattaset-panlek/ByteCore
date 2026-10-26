#!/bin/sh
# usage: ./run.sh script.js  -> prepends lib.js and executes in Figma
cat "$(dirname "$0")/lib.js" "$1" > /tmp/fig_build.js
bun "$(dirname "$0")/../talk-to-figma-local/scripts/fig.mjs" run /tmp/fig_build.js
