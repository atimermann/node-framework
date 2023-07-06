#!/bin/bash

npx pkg -t node18-linux-x64 --out-path build .
(cd build && mkdir -p config)
cp config/default.yaml build/config
cp .env build

echo
echo "Build Finalizado!!"
echo
echo "Leia documentação(README.md do @agtm/cli-tool) para correta configuração do pkg, alguma configuração extra pode ser necessária."
echo
