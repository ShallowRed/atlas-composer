#!/usr/bin/env bash
# Checks each GeoJSON file given as an argument: GEOS reads each of its geometries as valid,
# and tippecanoe tiles it without a warning. Needs ogrinfo of GDAL and tippecanoe.
set -euo pipefail

for file in "$@"; do
  layer=$(basename "$file" .geojson)

  invalid=$(ogrinfo -q -dialect sqlite \
    -sql "SELECT count(*) AS invalid FROM \"$layer\" WHERE NOT ST_IsValid(geometry)" "$file" \
    | sed -n 's/.*invalid (Integer) = //p')
  if [ "$invalid" != "0" ]; then
    echo "$file: ${invalid:-an unread number of} geometries are invalid for GEOS" >&2
    exit 1
  fi

  if ! log=$(tippecanoe -o "${file%.geojson}.pmtiles" -zg --force "$file" 2>&1); then
    echo "$log" >&2
    echo "$file: tippecanoe fails" >&2
    exit 1
  fi
  if grep -q 'Warning' <<<"$log"; then
    grep 'Warning' <<<"$log" >&2
    echo "$file: tippecanoe warns" >&2
    exit 1
  fi

  echo "$file: valid for GEOS, tiled by tippecanoe"
done
