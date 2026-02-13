#!/bin/bash
PROTO_DIR="./proto"
OUT_DIR="./src/generated"

# 출력 디렉토리 초기화
rm -rf $OUT_DIR
mkdir -p $OUT_DIR

# ts-proto를 사용하여 TypeScript 코드 생성
# outputClientImpl=grpc-web: Google의 grpc-web 라이브러리 호환 클라이언트 생성
protoc \
  --plugin=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=$OUT_DIR \
  --ts_proto_opt=esModuleInterop=true,outputClientImpl=grpc-web,env=browser \
  -I=$PROTO_DIR \
  $PROTO_DIR/analysis.proto

echo "✅ Generated Typescript Proto files!"