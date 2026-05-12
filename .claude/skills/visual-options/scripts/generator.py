#!/usr/bin/env python3
"""
Visual Options Generator

管理 visual-options 技能的 HTML 文件生成、浏览器打开和临时文件清理。

用法：
    python generator.py generate --title "React状态管理" --content "<svg>...</svg>"
    python generator.py open --file "path/to/file.html"
    python generator.py cleanup

依赖：
    - Python 3.8+
    - 无需额外依赖（使用标准库 webbrowser、pathlib、shutil）
"""

import argparse
import sys
import time
import webbrowser
from pathlib import Path


def get_project_root() -> Path:
    """获取项目根目录（调用脚本所在目录的父目录的父目录）"""
    return Path(__file__).parent.parent.parent


def get_output_dir() -> Path:
    """获取 .visual-options 目录路径"""
    root = get_project_root()
    output_dir = root / ".visual-options"
    output_dir.mkdir(exist_ok=True)
    return output_dir


def generate_filename(topic: str) -> str:
    """
    生成带时间戳的文件名
    格式: [时间戳]-[主题]-options.html
    """
    timestamp = int(time.time())
    safe_topic = "".join(c if c.isalnum() or c in ("-", "_") else "-" for c in topic)
    return f"{timestamp}-{safe_topic}-options.html"


def generate_html_file(title: str, content: str, filename: str) -> str:
    """
    生成 HTML 文件

    Args:
        title: 页面标题（用于替换模板中的 {{TITLE}}）
        content: 完整 HTML 内容
        filename: 文件名

    Returns:
        生成文件的绝对路径
    """
    output_dir = get_output_dir()
    file_path = output_dir / filename

    # 简单的模板替换
    html_content = content.replace("{{TITLE}}", title)

    file_path.write_text(html_content, encoding="utf-8")
    return str(file_path.resolve())


def open_in_browser_func(file_path: str):
    """在浏览器中打开文件"""
    file_url = f"file:///{file_path.replace(chr(92), '/')}"
    webbrowser.open(file_url)
    print(f"已在浏览器中打开: {file_path}")


def cleanup_func():
    """清理 .visual-options 目录"""
    output_dir = get_output_dir()
    if output_dir.exists() and output_dir.is_dir():
        import shutil
        shutil.rmtree(output_dir)
        print(f"已清理临时文件目录: {output_dir}")
    else:
        print(f"目录不存在，无需清理: {output_dir}")


def main():
    parser = argparse.ArgumentParser(
        description="Visual Options Generator - 管理 HTML 原型文件的生成和浏览器打开"
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # generate 命令
    gen_parser = subparsers.add_parser("generate", help="生成 HTML 文件并自动打开")
    gen_parser.add_argument("--title", required=True, help="页面标题")
    gen_parser.add_argument("--content", required=True, help="完整 HTML 内容")
    gen_parser.add_argument("--no-open", action="store_true", help="生成后不自动打开浏览器")

    # open 命令
    open_parser = subparsers.add_parser("open", help="在浏览器中打开文件")
    open_parser.add_argument("--file", required=True, help="文件路径")

    # cleanup 命令
    subparsers.add_parser("cleanup", help="清理 .visual-options 目录")

    args = parser.parse_args()

    if args.command == "generate":
        filename = generate_filename(args.title)
        file_path = generate_html_file(args.title, args.content, filename)
        print(f"文件已生成: {file_path}")
        if not args.no_open:
            open_in_browser_func(file_path)
    elif args.command == "open":
        open_in_browser_func(args.file)
    elif args.command == "cleanup":
        cleanup_func()
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()