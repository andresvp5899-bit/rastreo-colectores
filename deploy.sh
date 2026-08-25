#!/bin/bash

set -Eeuo pipefail

PROYECTO="/home/andres_vazquez/rastreo-colectores"
HISTORIAL="/home/andres_vazquez/deploy-history.log"
RAMA="main"

cd "$PROYECTO"

VERSION_ANTERIOR="$(git rev-parse --short HEAD 2>/dev/null || echo desconocida)"

registrar_error() {
    CODIGO=$?
    VERSION_ACTUAL="$(git rev-parse --short HEAD 2>/dev/null || echo desconocida)"
    FECHA="$(date '+%d/%m/%Y %H:%M')"
    echo "${FECHA}|${VERSION_ANTERIOR}|${VERSION_ACTUAL}|${RAMA}|ERROR" >> "$HISTORIAL"
    exit "$CODIGO"
}

trap registrar_error ERR

git fetch origin "$RAMA"
git reset --hard "origin/$RAMA"

VERSION_NUEVA="$(git rev-parse --short HEAD)"

"$PROYECTO/venv/bin/pip" install -r requirements.txt >/tmp/rastreo-pip.log 2>&1

FECHA="$(date '+%d/%m/%Y %H:%M')"

echo "${FECHA}|${VERSION_ANTERIOR}|${VERSION_NUEVA}|${RAMA}|CORRECTO" >> "$HISTORIAL"

sudo systemctl restart rastreo-colectores