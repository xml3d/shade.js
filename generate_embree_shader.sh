#!/bin/bash

node tools/js2embree.js data/js/shader/checker-embree.js -p > ../embree/examples/renderer/device_singleray/materials/shadejs_material.h
