import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

# Base mappings for the language rules
_LANG_RULES = {
    "vi": {
        "reply": "Trả lời người dùng luôn luôn bằng Tiếng Việt",
        "reply_desc": "Mọi phản hồi, quá trình suy nghĩ, danh sách công việc và file kế hoạch đều phải dùng Tiếng Việt",
        "video": "Mọi video, lời bình, Vietsub phải là ngôn ngữ Tiếng Việt",
        "doc": "Tất cả các file Markdown phải được viết bằng Tiếng Việt",
        "prompt": "Prompt tạo ảnh/tạo video phải được viết bằng Tiếng Việt"
    },
    "en": {
        "reply": "Always answer the user in English",
        "reply_desc": "All replies, thought processes, task lists, and plan files must use English",
        "video": "All generated video dialogues, voiceovers, and subtitles must be in English",
        "doc": "All Markdown files must be written in English",
        "prompt": "Prompts for image/video generation should be written in English"
    },
    "zh": {
        "reply": "回答用户必须使用中文",
        "reply_desc": "所有回复、思考过程、任务清单及计划文件，均须使用中文",
        "video": "所有生成的视频对话、旁白、字幕均使用中文",
        "doc": "所有的 Markdown 文件均使用中文编写",
        "prompt": "图片生成/视频生成使用的 prompt 应使用中文编写"
    }
}

def update_agent_language_rules(output_lang: str) -> None:
    """Update AGENTS.md and CLAUDE.md language rules dynamically."""
    rules = _LANG_RULES.get(output_lang, _LANG_RULES["zh"])

    project_root = Path(__file__).parent.parent.parent
    
    # 1. Update AGENTS.md
    agents_md_path = project_root / "AGENTS.md"
    if agents_md_path.exists():
        try:
            content = agents_md_path.read_text(encoding="utf-8")
            replacement = (
                "<!-- LANGUAGE_RULES_START -->\n"
                f"- **{rules['reply']}**：{rules['reply_desc']}\n"
                "<!-- LANGUAGE_RULES_END -->"
            )
            new_content = re.sub(
                r"<!-- LANGUAGE_RULES_START -->.*?<!-- LANGUAGE_RULES_END -->",
                replacement,
                content,
                flags=re.DOTALL
            )
            agents_md_path.write_text(new_content, encoding="utf-8")
        except Exception as e:
            logger.warning("Failed to update AGENTS.md language rules: %s", e)

    # 2. Update agent_runtime_profile/CLAUDE.md
    claude_md_path = project_root / "agent_runtime_profile" / "CLAUDE.md"
    if claude_md_path.exists():
        try:
            content = claude_md_path.read_text(encoding="utf-8")
            replacement = (
                "<!-- LANGUAGE_RULES_START -->\n"
                f"- **{rules['reply']}**：{rules['reply_desc']}\n"
                f"- **{rules['video']}**\n"
                f"- **{rules['doc']}**\n"
                f"- **{rules['prompt']}**\n"
                "<!-- LANGUAGE_RULES_END -->"
            )
            new_content = re.sub(
                r"<!-- LANGUAGE_RULES_START -->.*?<!-- LANGUAGE_RULES_END -->",
                replacement,
                content,
                flags=re.DOTALL
            )
            claude_md_path.write_text(new_content, encoding="utf-8")
        except Exception as e:
            logger.warning("Failed to update CLAUDE.md language rules: %s", e)
