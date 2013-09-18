#!/bin/bash

#FILE=data/js/shader/checker-embree.js
FILE=data/js/shader/parquet_plank-embree.js

node tools/js2embree.js "$FILE"  -p > ../embree/examples/renderer/device_singleray/materials/shadejs_material.h
