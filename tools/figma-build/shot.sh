#!/bin/sh
# usage: ./shot.sh nodeId scale out.png
sed "s/ARG/'$1'/; s/__S__/${2:-0.5}/" "$(dirname "$0")/shot.js" > /tmp/fig_shot.js
bun "$(dirname "$0")/../talk-to-figma-local/scripts/fig.mjs" run /tmp/fig_shot.js | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s).result;require('fs').writeFileSync('$3',Buffer.from(r,'base64'))})"
