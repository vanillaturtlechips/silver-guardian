#!/bin/bash
PROTO_DIR="./proto"
OUT_DIR="./src/generated"
mkdir -p $OUT_DIR

# 직접 경로 지정
protoc \
  -I=$PROTO_DIR \
  --plugin=protoc-gen-js=./node_modules/.bin/protoc-gen-js \
  --plugin=protoc-gen-grpc-web=./node_modules/.bin/protoc-gen-grpc-web \
  --js_out=import_style=commonjs:$OUT_DIR \
  --grpc-web_out=import_style=typescript,mode=grpcwebtext:$OUT_DIR \
  $PROTO_DIR/analysis.proto

echo "✅ Generated!"
