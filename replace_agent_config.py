import re

file_path = 'frontend/src/components/pages/AgentConfigTab.tsx'
content = open(file_path, 'r', encoding='utf-8').read()

# Add useTranslation if not imported
if 'import { useTranslation } from "@/utils/i18n"' not in content:
    content = 'import { useTranslation } from "@/utils/i18n";\n' + content

# Add const { t } = useTranslation() inside AgentConfigTab
if 'export function AgentConfigTab({ visible' in content and 'const { t } = useTranslation();' not in content:
    content = content.replace('export function AgentConfigTab({ visible }: AgentConfigTabProps) {\n', 
                            'export function AgentConfigTab({ visible }: AgentConfigTabProps) {\n  const { t } = useTranslation();\n')

# Wait, `useAppStore.getState().pushToast("ArcReel 智能体配置已保存", "success");` does not need `t` to be in scope as long as we import dict? 
# Actually, the user's `pushToast` is better handled by just doing `t(...)`. But `t` only exists inside the AgentConfigTab!
# The `toast` calls are inside an async function inside AgentConfigTab. So `t` is available!

replacements = [
    ('"ArcReel 智能体配置已保存"', 't("toast.save_success")'),
    ('"`${label} 已清除`"', '`${label} ${t("toast.clear_success")}`'),
    ('`清除失败: ${(err as Error).message}`', '`${t("toast.clear_failed")} ${(err as Error).message}`'),
    ('加载失败: {loadError}', '{t("error.load_failed")} {loadError}'),
    ('>重试<', '>{t("btn.retry")}<'),
    ('>加载中…<', '>{t("lbl.loading")}<'),
    ('>ArcReel 智能体<', '>{t("agent.header_title")}<'),
    ('基于 Claude Agent SDK，驱动对话式 AI 助手与自动化工作流', '{t("agent.header_desc")}'),
    ('配置项兼容 Claude Code 环境变量命名，可使用兼容 Claude Code 的 Coding Plan API。', '{t("agent.header_note")}'),
    ('title="运行引擎"', 'title={t("agent.engine")}'),
    ('description="选择驱动智能体的主力后端"', 'description={t("agent.engine_desc")}'),
    ('>后端引擎<', '>{t("agent.backend_engine")}<'),
    ('>Claude Agent SDK (官方默认)<', '>{t("agent.engine_claude")}<'),
    ('>Google GenAI (Gemini 备用通道)<', '>{t("agent.engine_gemini")}<'),
    ('切换为 Gemini 时，将绕过部分 Anthropic 专有策略。请确保已在供应商列表配置对应的 API Key。', '{t("agent.gemini_warning")}'),
    ('>Gemini 智能体模型<', '>{t("agent.gemini_model_title")}<'),
    ('默认使用 <code>gemini-2.5-flash</code>，需要支持 Function Calling 的模型。', '{t("agent.gemini_model_desc")}'),
    ('title="输出与界面语言 (Language)"', 'title={t("settings.output_lang")}'),
    ('description="选择 AI 生成剧本的语言结构以及系统界面的显示语言。"', 'description={t("settings.output_lang_desc")}'),
    ('>设定语言<', '>{t("settings.set_lang")}<'),
    ('>中文 (Chinese - 默认)<', '>{t("settings.output_lang_zh")}<'),
    ('>English (英语)<', '>{t("settings.output_lang_en")}<'),
    ('切换后，Agent 和剧本生成都会使用此语言（系统专有名词如 JSON, Prompt, Character 等保留英文）。', '{t("settings.lang_warning")}'),
    ('title="API 凭证 (Claude)"', 'title={t("agent.api_cred")}'),
    ('description="Anthropic API 密钥是 Claude 智能体运行的必要条件"', 'description={t("agent.api_cred_desc")}'),
    ('当前：', '{t("agent.current")}'),
    ('"已设置"', 't("agent.is_set")'),
    ('"清除已保存的 Anthropic API Key"', 't("agent.clear_anthropic_key")'),
    ('对应环境变量 ANTHROPIC_API_KEY', '{t("agent.env_anthropic_key")}'),
    ('"清除输入"', 't("btn.clear_input")'),
    ('"隐藏密钥" : "显示密钥"', 't("btn.hide_key") : t("btn.show_key")'),
    ('"清除已保存的 Anthropic Base URL"', 't("agent.clear_base_url")'),
    ('>清除已保存<', '>{t("btn.clear_saved")}<'),
    ('对应 ANTHROPIC_BASE_URL，留空使用官方默认地址', '{t("agent.env_base_url")}'),
    ('"清除 Base URL 输入"', 't("agent.clear_base_url_input")'),
    ('title="模型配置"', 'title={t("agent.model_config")}'),
    ('description="指定智能体使用的 Claude 模型。留空则使用 Claude Agent SDK 默认值。"', 'description={t("agent.model_config_desc")}'),
    ('>默认模型<', '>{t("agent.default_model")}<'),
    ('"清除已保存的模型配置"', 't("agent.clear_model_config")'),
    ('对应 ANTHROPIC_MODEL，覆盖默认模型', '{t("agent.env_model")}'),
    ('"清除模型配置输入"', 't("agent.clear_model_input")'),
    ('>高级模型路由<', '>{t("agent.adv_routing")}<'),
    ('Claude Agent SDK 支持按能力等级路由到不同模型。留空则统一使用上方的默认模型。', '{t("agent.adv_routing_desc")}'),
    ('label: "Haiku 模型"', 'label: t("agent.model_haiku")'),
    ('hint: "轻量任务（分类、提取、简单问答）"', 'hint: t("agent.model_haiku_desc")'),
    ('label: "Sonnet 模型"', 'label: t("agent.model_sonnet")'),
    ('hint: "均衡任务（写作、编排、多步推理）"', 'hint: t("agent.model_sonnet_desc")'),
    ('label: "Opus 模型"', 'label: t("agent.model_opus")'),
    ('hint: "复杂任务（长文创作、深度分析）"', 'hint: t("agent.model_opus_desc")'),
    ('label: "子 Agent 模型"', 'label: t("agent.model_subagent")'),
    ('hint: "Subagent 并行执行时使用的模型"', 'hint: t("agent.model_subagent_desc")'),
    ('`清除已保存的 ${label}`', '`${t("btn.clear_saved")} ${label}`'),
    ('>清除<', '>{t("btn.clear")}<'),
    ('`清除 ${label} 输入`', '`${t("btn.clear_input")} ${label}`'),
    ('>高级设置<', '>{t("settings.advanced")}<'),
    ('>会话清理延迟（秒）<', '>{t("agent.cleanup_delay")}<'),
    ('会话结束后等待此时间再释放资源，再次对话时会自动恢复', '{t("agent.cleanup_delay_desc")}'),
    ('>最大并发会话数<', '>{t("agent.max_concurrent")}<'),
    ('同时保持活跃的智能体会话上限，超出时自动释放最久未使用的会话（清理的会话会持久化，下次对话时恢复）', '{t("agent.max_concurrent_desc")}'),
]

for old, new in replacements:
    content = content.replace(old, new)

open(file_path, 'w', encoding='utf-8').write(content)
print("Updated AgentConfigTab")
