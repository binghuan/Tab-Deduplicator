#!/bin/bash

# Tab Deduplicator - Build Script
# This script builds the Firefox extension (.xpi file)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
XPI_NAME="Tab-Deduplicator.xpi"
XPI_PATH="${SCRIPT_DIR}/${XPI_NAME}"

echo -e "${YELLOW}🔧 Building Tab Deduplicator...${NC}"
echo ""

# Step 1: Clean old build
echo -e "${YELLOW}🧹 Cleaning old build...${NC}"
if [ -f "$XPI_PATH" ]; then
    rm "$XPI_PATH"
    echo -e "${GREEN}   ✓ Removed old ${XPI_NAME}${NC}"
else
    echo -e "   No old build found"
fi
echo ""

# Step 2: Build new XPI
echo -e "${YELLOW}📦 Building new XPI...${NC}"
cd "$SCRIPT_DIR"

zip -r "$XPI_NAME" \
    manifest.json \
    background.js \
    popup/ \
    options/ \
    icons/ \
    -x "*.DS_Store" \
    -x "*/.DS_Store"

echo ""

# Step 3: Verify build
if [ -f "$XPI_PATH" ]; then
    SIZE=$(ls -lh "$XPI_PATH" | awk '{print $5}')
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo -e "   📁 Output: ${XPI_PATH}"
    echo -e "   📊 Size: ${SIZE}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
