#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=8011

# 启动后端
cd "$PROJECT_DIR/backend"
source venv/bin/activate
uvicorn app.main:app --reload --port "$BACKEND_PORT" &
BACKEND_PID=$!

# 启动前端
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "后端 PID: $BACKEND_PID (http://localhost:$BACKEND_PORT)"
echo "前端 PID: $FRONTEND_PID (http://localhost:5173)"
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
