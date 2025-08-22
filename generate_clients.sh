#!/usr/bin/env bash

generate_clients() {
  algokit compile py \
    --out-dir /artifacts \
    /src/src/contract.py 
  local artifact
  local artifacts=("BankManger" "SpinManager" "ReelManager" "SlotMachine" "Beacon" "YieldBearingToken" "ReelManager")
  for artifact in "${artifacts[@]}"; do
    algokit generate client "/artifacts/${artifact}.arc32.json" \
      --version 3.0.0 \
      --language typescript \
      --output "/src/src/scripts/clients/${artifact}Client.ts"
    jq '.contract' "/artifacts/${artifact}.arc32.json" > "/artifacts/${artifact,,}.contract.json"
  done
}

generate_clients