import { create } from "zustand";

export type SupportedLanguage = "zh" | "vi" | "en";

interface I18nState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  language: "zh",
  setLanguage: (lang) => set({ language: lang }),
}));

// Dictionaries
const dict = {
  zh: {
    // Top nav & Core verbs
    "nav.projects": "项目",
    "nav.system_settings": "系统设置",
    "nav.docs": "官方文档",
    "nav.agent": "智能体",
    "nav.providers": "供应商",
    "nav.media": "模型选择",
    "nav.usage": "用量统计",
    "nav.api_keys": "API 管理",
    "btn.create": "新建",
    "btn.save": "保存",
    "btn.cancel": "取消",
    "btn.delete": "删除",
    "btn.edit": "编辑",

    // Project Creation/Config
    "project.title": "项目标题",
    "project.title_ph": "例如：百年孤独",
    "project.mode": "剧情模式",
    "project.mode_narration": "说书模式 (适合单人解说)",
    "project.mode_drama": "剧集模式 (适合多角色演绎)",
    "project.style": "视觉风格",

    // System Settings
    "settings.system": "系统全局配置",
    "settings.output_lang": "输出与界面语言",
    "settings.output_lang_zh": "中文 (Mặc định)",
    "settings.output_lang_vi": "Tiếng Việt (Vietnamese)",
    "settings.output_lang_en": "English (Tiếng Anh)",
    "settings.agent_orchestrator": "Agent 模型调度引擎",
    "settings.gemini_model": "Gemini 引擎默认模型",

    // Agent Chat
    "agent.title": "AI 工作流向导",
    "agent.input_ph": "描述你想生成的故事情节、或输入 / 查看可用工作流...",
    
    // Labels that shouldn't be strictly translated but kept for consistency
    "lbl.json": "JSON",
    "lbl.prompt": "Prompt"
  },
  vi: {
    "nav.projects": "Dự án",
    "nav.system_settings": "Cài đặt hệ thống",
    "nav.docs": "Tài liệu",
    "nav.agent": "Trợ lý ảo (Agent)",
    "nav.providers": "Nguồn API (Providers)",
    "nav.media": "Chọn Mô Hình (Models)",
    "nav.usage": "Thống kê (Usage)",
    "nav.api_keys": "Quản lý Khóa API",
    "btn.create": "Tạo mới",
    "btn.save": "Lưu lại",
    "btn.cancel": "Hủy",
    "btn.delete": "Xóa",
    "btn.edit": "Sửa",

    "project.title": "Tên dự án",
    "project.title_ph": "Ví dụ: Trăm năm cô đơn",
    "project.mode": "Thể loại kịch bản",
    "project.mode_narration": "Kể chuyện (Narration/Đơn thoại)",
    "project.mode_drama": "Phim dài tập (Drama/Đa nhân vật)",
    "project.style": "Phong cách hình ảnh",

    "settings.system": "Cấu hình toàn cầu Hệ thống",
    "settings.output_lang": "Ngôn ngữ Giao diện & Agent",
    "settings.output_lang_zh": "中文 (Tiếng Trung)",
    "settings.output_lang_vi": "Tiếng Việt",
    "settings.output_lang_en": "English (Tiếng Anh)",
    "settings.agent_orchestrator": "Động cơ điều phối Agent",
    "settings.gemini_model": "Mô hình Gemini mặc định",

    "agent.title": "Trợ lý AI (Agent)",
    "agent.input_ph": "Bạn muốn làm gì? Gõ / để chọn các lệnh tạo kịch bản, làm video...",

    "lbl.json": "JSON",
    "lbl.prompt": "Prompt"
  },
  en: {
    "nav.projects": "Projects",
    "nav.system_settings": "System Settings",
    "nav.docs": "Documentation",
    "nav.agent": "Agents",
    "nav.providers": "Providers",
    "nav.media": "Model Config",
    "nav.usage": "Usage Stats",
    "nav.api_keys": "API Keys",
    "btn.create": "Create",
    "btn.save": "Save",
    "btn.cancel": "Cancel",
    "btn.delete": "Delete",
    "btn.edit": "Edit",

    "project.title": "Project Title",
    "project.title_ph": "e.g., One Hundred Years of Solitude",
    "project.mode": "Content Mode",
    "project.mode_narration": "Narration (Single Voiceover)",
    "project.mode_drama": "Drama (Multi-character)",
    "project.style": "Visual Style",

    "settings.system": "Global System Settings",
    "settings.output_lang": "UI & Agent Output Language",
    "settings.output_lang_zh": "Chinese (中文)",
    "settings.output_lang_vi": "Vietnamese (Tiếng Việt)",
    "settings.output_lang_en": "English",
    "settings.agent_orchestrator": "Agent Orchestrator Engine",
    "settings.gemini_model": "Default Gemini Model",

    "agent.title": "AI Workflow Assistant",
    "agent.input_ph": "Describe what you want to do, or type / to see available slash commands...",

    "lbl.json": "JSON",
    "lbl.prompt": "Prompt"
  }
};

/**
 * Returns the translated string for a given key, 
 * falling back to Chinese if not found.
 */
export function useTranslation() {
  const { language } = useI18nStore();

  const t = (key: keyof typeof dict.zh): string => {
    const langDict = dict[language];
    if (langDict && key in langDict) {
      return (langDict as any)[key];
    }
    // Fallback to zh
    return dict.zh[key] || key;
  };

  return { t, language };
}
