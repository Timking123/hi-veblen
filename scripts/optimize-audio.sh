#!/bin/bash

###############################################################################
# 音频优化脚本
# 
# 此脚本将音频文件转换为 MP3 格式，比特率 128kbps，并进行优化
# 
# 使用方法:
#   ./scripts/optimize-audio.sh <input_directory> <output_directory>
# 
# 示例:
#   ./scripts/optimize-audio.sh ./raw-audio ./public/audio
# 
# 要求:
#   - 安装 ffmpeg
#   - 输入目录包含 WAV、OGG 或其他音频格式文件
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
if [ $# -lt 2 ]; then
    echo -e "${RED}错误: 缺少参数${NC}"
    echo "使用方法: $0 <input_directory> <output_directory>"
    echo "示例: $0 ./raw-audio ./public/audio"
    exit 1
fi

INPUT_DIR="$1"
OUTPUT_DIR="$2"

# 检查输入目录
if [ ! -d "$INPUT_DIR" ]; then
    echo -e "${RED}错误: 输入目录不存在: $INPUT_DIR${NC}"
    exit 1
fi

# 检查 ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}错误: 未找到 ffmpeg${NC}"
    echo "请先安装 ffmpeg: https://ffmpeg.org/download.html"
    exit 1
fi

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}音频优化脚本${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo "输入目录: $INPUT_DIR"
echo "输出目录: $OUTPUT_DIR"
echo ""

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 计数器
SUCCESS_COUNT=0
FAIL_COUNT=0
TOTAL_COUNT=0

# 处理音频文件
process_audio() {
    local input_file="$1"
    local output_file="$2"
    local is_music="$3"
    
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    
    echo -n "处理: $(basename "$input_file") ... "
    
    # 根据文件类型选择不同的参数
    if [ "$is_music" = "true" ]; then
        # 音乐: 立体声, 128kbps
        ffmpeg -i "$input_file" \
            -ac 2 \
            -b:a 128k \
            -ar 44100 \
            -af "loudnorm" \
            -y "$output_file" \
            2>/dev/null
    else
        # 音效: 单声道, 128kbps, 移除静音
        ffmpeg -i "$input_file" \
            -ac 1 \
            -b:a 128k \
            -ar 44100 \
            -af "silenceremove=1:0:-50dB,loudnorm" \
            -y "$output_file" \
            2>/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        
        # 显示文件大小
        local size=$(du -h "$output_file" | cut -f1)
        echo "  → 大小: $size"
    else
        echo -e "${RED}✗${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

# 处理背景音乐
echo -e "${YELLOW}处理背景音乐...${NC}"
MUSIC_INPUT="$INPUT_DIR/music"
MUSIC_OUTPUT="$OUTPUT_DIR/music"

if [ -d "$MUSIC_INPUT" ]; then
    mkdir -p "$MUSIC_OUTPUT"
    
    for file in "$MUSIC_INPUT"/*.{wav,ogg,flac,aiff,m4a} 2>/dev/null; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            name="${filename%.*}"
            output_file="$MUSIC_OUTPUT/${name}.mp3"
            process_audio "$file" "$output_file" "true"
        fi
    done
else
    echo -e "${YELLOW}  跳过: 未找到 music 目录${NC}"
fi

echo ""

# 处理音效
echo -e "${YELLOW}处理音效...${NC}"
SFX_INPUT="$INPUT_DIR/sfx"
SFX_OUTPUT="$OUTPUT_DIR/sfx"

if [ -d "$SFX_INPUT" ]; then
    mkdir -p "$SFX_OUTPUT"
    
    for file in "$SFX_INPUT"/*.{wav,ogg,flac,aiff,m4a} 2>/dev/null; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            name="${filename%.*}"
            output_file="$SFX_OUTPUT/${name}.mp3"
            process_audio "$file" "$output_file" "false"
        fi
    done
else
    echo -e "${YELLOW}  跳过: 未找到 sfx 目录${NC}"
fi

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}完成: $SUCCESS_COUNT/$TOTAL_COUNT 个文件${NC}"
if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}失败: $FAIL_COUNT 个文件${NC}"
fi
echo -e "${GREEN}==================================${NC}"
echo ""

# 显示优化建议
echo "优化建议:"
echo "1. 检查输出文件的音质是否满足要求"
echo "2. 音乐文件应 < 1 MB"
echo "3. 音效文件应 < 50 KB"
echo "4. 使用音频播放器测试循环播放（音乐）"
echo "5. 在游戏中测试所有音频文件"
echo ""

exit 0
