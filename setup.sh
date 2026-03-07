#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "===== 基金管家 - 自动安装依赖 ====="
echo ""

# ---------- 检查基础工具 ----------
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "❌ 未找到 $1，请先安装: $2"
    exit 1
  fi
}

check_cmd node  "https://nodejs.org/"
check_cmd npm   "https://nodejs.org/"
check_cmd uv    "https://docs.astral.sh/uv/getting-started/installation/"

echo "✔ node $(node -v)"
echo "✔ npm  $(npm -v)"
echo "✔ uv   $(uv version)"
echo ""

# ---------- 后端 ----------
echo "----- 安装后端依赖 -----"
BACKEND_DIR="$ROOT_DIR/backend"

if [ ! -d "$BACKEND_DIR/venv" ]; then
  echo "创建 Python 虚拟环境..."
  uv venv "$BACKEND_DIR/venv"
fi

echo "安装 Python 依赖..."
VIRTUAL_ENV="$BACKEND_DIR/venv" uv pip install -r "$BACKEND_DIR/requirements.txt"
echo "✔ 后端依赖安装完成"
echo ""

# ---------- 前端 ----------
echo "----- 安装前端依赖 -----"
FRONTEND_DIR="$ROOT_DIR/frontend"

cd "$FRONTEND_DIR"
npm install
echo "✔ 前端依赖安装完成"
echo ""

# ---------- 数据目录 ----------
mkdir -p "$ROOT_DIR/data"

# ---------- 完成 ----------
echo "===== 全部依赖安装完成 ====="
echo ""
echo "启动方式:"
echo "  后端: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "  前端: cd frontend && npm run dev"
