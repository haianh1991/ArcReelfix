import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Eye, EyeOff, Loader2, SlidersHorizontal, Terminal, X } from "lucide-react";
import { useWarnUnsaved } from "@/hooks/useWarnUnsaved";
import ClaudeColor from "@lobehub/icons/es/Claude/components/Color";
import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";
import { useConfigStatusStore } from "@/stores/config-status-store";
import type { GetSystemConfigResponse, SystemConfigPatch } from "@/types";
import { TabSaveFooter } from "./TabSaveFooter";

// ---------------------------------------------------------------------------
// Draft types
// ---------------------------------------------------------------------------

interface AgentDraft {
  anthropicKey: string;        // new API key input (empty = don't change)
  anthropicBaseUrl: string;    // in-place editing; empty = clear
  anthropicModel: string;      // in-place editing; empty = clear
  haikuModel: string;
  opusModel: string;
  sonnetModel: string;
  subagentModel: string;
  agentOrchestrator: string;
  geminiAgentModel: string;
  cleanupDelaySeconds: string;
  maxConcurrentSessions: string;
}

function buildDraft(data: GetSystemConfigResponse): AgentDraft {
  const s = data.settings;
  return {
    anthropicKey: "",
    anthropicBaseUrl: s.anthropic_base_url ?? "",
    anthropicModel: s.anthropic_model ?? "",
    haikuModel: s.anthropic_default_haiku_model ?? "",
    opusModel: s.anthropic_default_opus_model ?? "",
    sonnetModel: s.anthropic_default_sonnet_model ?? "",
    subagentModel: s.claude_code_subagent_model ?? "",
    agentOrchestrator: s.agent_orchestrator ?? "claude",
    geminiAgentModel: s.gemini_agent_model ?? "gemini-2.5-flash",
    cleanupDelaySeconds: String(s.agent_session_cleanup_delay_seconds ?? 300),
    maxConcurrentSessions: String(s.agent_max_concurrent_sessions ?? 5),
  };
}

function deepEqual(a: AgentDraft, b: AgentDraft): boolean {
  return (
    a.anthropicKey === b.anthropicKey &&
    a.anthropicBaseUrl === b.anthropicBaseUrl &&
    a.anthropicModel === b.anthropicModel &&
    a.haikuModel === b.haikuModel &&
    a.opusModel === b.opusModel &&
    a.sonnetModel === b.sonnetModel &&
    a.subagentModel === b.subagentModel &&
    a.agentOrchestrator === b.agentOrchestrator &&
    a.geminiAgentModel === b.geminiAgentModel &&
    a.cleanupDelaySeconds === b.cleanupDelaySeconds &&
    a.maxConcurrentSessions === b.maxConcurrentSessions
  );
}

function buildPatch(draft: AgentDraft, saved: AgentDraft): SystemConfigPatch {
  const patch: SystemConfigPatch = {};
  if (draft.anthropicKey.trim()) patch.anthropic_api_key = draft.anthropicKey.trim();
  if (draft.anthropicBaseUrl !== saved.anthropicBaseUrl)
    patch.anthropic_base_url = draft.anthropicBaseUrl || "";
  if (draft.anthropicModel !== saved.anthropicModel)
    patch.anthropic_model = draft.anthropicModel || "";
  if (draft.haikuModel !== saved.haikuModel)
    patch.anthropic_default_haiku_model = draft.haikuModel || "";
  if (draft.opusModel !== saved.opusModel)
    patch.anthropic_default_opus_model = draft.opusModel || "";
  if (draft.sonnetModel !== saved.sonnetModel)
    patch.anthropic_default_sonnet_model = draft.sonnetModel || "";
  if (draft.subagentModel !== saved.subagentModel)
    patch.claude_code_subagent_model = draft.subagentModel || "";
  if (draft.agentOrchestrator !== saved.agentOrchestrator)
    patch.agent_orchestrator = draft.agentOrchestrator;
  if (draft.geminiAgentModel !== saved.geminiAgentModel)
    patch.gemini_agent_model = draft.geminiAgentModel || "";
  if (draft.cleanupDelaySeconds !== saved.cleanupDelaySeconds)
    patch.agent_session_cleanup_delay_seconds = Number(draft.cleanupDelaySeconds) || 300;
  if (draft.maxConcurrentSessions !== saved.maxConcurrentSessions)
    patch.agent_max_concurrent_sessions = Number(draft.maxConcurrentSessions) || 5;
  return patch;
}

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------

const cardClassName = "rounded-xl border border-gray-800 bg-gray-950/40 p-4";
const inputClassName =
  "w-full rounded-lg border border-gray-700 bg-gray-900/80 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-indigo-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60";
const smallBtnClassName =
  "rounded p-1 text-gray-500 hover:text-gray-300 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none";

// Model routing config — static, hoisted to module level to avoid re-creation on each render
const MODEL_ROUTING_FIELDS = [
  {
    key: "haikuModel" as const,
    label: "Haiku 模型",
    envVar: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    hint: "轻量任务（分类、提取、简单问答）",
    patchKey: "anthropic_default_haiku_model" as const,
  },
  {
    key: "sonnetModel" as const,
    label: "Sonnet 模型",
    envVar: "ANTHROPIC_DEFAULT_SONNET_MODEL",
    hint: "均衡任务（写作、编排、多步推理）",
    patchKey: "anthropic_default_sonnet_model" as const,
  },
  {
    key: "opusModel" as const,
    label: "Opus 模型",
    envVar: "ANTHROPIC_DEFAULT_OPUS_MODEL",
    hint: "复杂任务（长文创作、深度分析）",
    patchKey: "anthropic_default_opus_model" as const,
  },
  {
    key: "subagentModel" as const,
    label: "子 Agent 模型",
    envVar: "CLAUDE_CODE_SUBAGENT_MODEL",
    hint: "Subagent 并行执行时使用的模型",
    patchKey: "claude_code_subagent_model" as const,
  },
] as const;

// Small inline clear button shown next to "当前：" when a value is set
const inlineClearClassName =
  "ml-1.5 inline-flex items-center rounded p-0.5 text-gray-600 transition-colors hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-100">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AgentConfigTabProps {
  visible: boolean;
}

export function AgentConfigTab({ visible }: AgentConfigTabProps) {
  const [remoteData, setRemoteData] = useState<GetSystemConfigResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentDraft>({
    anthropicKey: "",
    anthropicBaseUrl: "",
    anthropicModel: "",
    haikuModel: "",
    opusModel: "",
    sonnetModel: "",
    subagentModel: "",
    agentOrchestrator: "claude",
    geminiAgentModel: "gemini-2.5-flash",
    cleanupDelaySeconds: "300",
    maxConcurrentSessions: "5",
  });
  const savedRef = useRef<AgentDraft>({
    anthropicKey: "",
    anthropicBaseUrl: "",
    anthropicModel: "",
    haikuModel: "",
    opusModel: "",
    sonnetModel: "",
    subagentModel: "",
    agentOrchestrator: "claude",
    geminiAgentModel: "gemini-2.5-flash",
    cleanupDelaySeconds: "300",
    maxConcurrentSessions: "5",
  });
  const [saving, setSaving] = useState(false);
  const [clearingField, setClearingField] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [modelRoutingExpanded, setModelRoutingExpanded] = useState(false);

  // Load config on mount
  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await API.getSystemConfig();
      setRemoteData(res);
      const d = buildDraft(res);
      savedRef.current = d;
      setDraft(d);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isDirty = !deepEqual(draft, savedRef.current);
  useWarnUnsaved(isDirty);

  const updateDraft = useCallback(
    <K extends keyof AgentDraft>(key: K, value: AgentDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
      setSaveError(null);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const patch = buildPatch(draft, savedRef.current);
    if (Object.keys(patch).length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await API.updateSystemConfig(patch);
      setRemoteData(res);
      const newDraft = buildDraft(res);
      savedRef.current = newDraft;
      setDraft(newDraft);
      useConfigStatusStore.getState().refresh();
      useAppStore.getState().pushToast("ArcReel 智能体配置已保存", "success");
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const handleReset = useCallback(() => {
    setDraft(savedRef.current);
    setSaveError(null);
  }, []);

  // Clear a single field immediately via PATCH
  const handleClearField = useCallback(
    async (fieldId: string, patch: SystemConfigPatch, label: string) => {
      setClearingField(fieldId);
      try {
        const res = await API.updateSystemConfig(patch);
        setRemoteData(res);
        const nextSavedDraft = buildDraft(res);
        savedRef.current = nextSavedDraft;
        setDraft(nextSavedDraft);
        useConfigStatusStore.getState().refresh();
        useAppStore.getState().pushToast(`${label} 已清除`, "success");
      } catch (err) {
        useAppStore.getState().pushToast(`清除失败: ${(err as Error).message}`, "error");
      } finally {
        setClearingField(null);
      }
    },
    [],
  );

  const isBusy = saving || clearingField !== null;

  // Loading / error states
  if (loadError) {
    return (
      <div className={visible ? "px-6 py-8" : "hidden"}>
        <div className="text-sm text-rose-400">加载失败: {loadError}</div>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-gray-600 hover:bg-gray-800/50"
        >
          <Loader2 className="h-4 w-4" />
          重试
        </button>
      </div>
    );
  }

  if (!remoteData) {
    return (
      <div className={visible ? "flex items-center gap-2 px-6 py-8 text-gray-400" : "hidden"}>
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        加载中…
      </div>
    );
  }

  const settings = remoteData.settings;

  return (
    <div className={visible ? undefined : "hidden"}>
      <div className="space-y-8 px-6 pb-0 pt-6">
        {/* Page intro */}
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 shadow-inner shadow-white/5">
              <ClaudeColor size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">ArcReel 智能体</h2>
              <p className="text-sm text-gray-500">
                基于 Claude Agent SDK，驱动对话式 AI 助手与自动化工作流
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-gray-800/60 bg-gray-900/30 px-3 py-2">
            <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
            <p className="text-xs text-gray-500">
              配置项兼容 Claude Code 环境变量命名，可使用兼容 Claude Code 的 Coding Plan API。
            </p>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Section 0: Orchestrator Engine */}
        {/* ----------------------------------------------------------------- */}
        <div>
          <SectionHeading
            title="运行引擎"
            description="选择驱动智能体的主力后端"
          />
          <div className={`${cardClassName} space-y-4`}>
            <div>
              <label htmlFor="agent-orchestrator" className="block text-sm font-medium text-gray-100">
                后端引擎
              </label>
              <select
                id="agent-orchestrator"
                value={draft.agentOrchestrator}
                onChange={(e) => updateDraft("agentOrchestrator", e.target.value)}
                className={`${inputClassName} mt-2 block w-full appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat`}
                disabled={saving}
              >
                <option value="claude">Claude Agent SDK (官方默认)</option>
                <option value="gemini">Google GenAI (Gemini 备用通道)</option>
              </select>
              <p className="mt-1.5 text-xs text-gray-500">
                切换为 Gemini 时，将绕过部分 Anthropic 专有策略。请确保已在供应商列表配置对应的 API Key。
              </p>
            </div>
            {draft.agentOrchestrator === "gemini" && (
              <div className="border-t border-gray-800 pt-4">
                <label htmlFor="gemini-agent-model" className="block text-sm font-medium text-gray-100">
                  Gemini 智能体模型
                </label>
                <p className="mt-0.5 text-xs text-gray-500">
                  默认使用 <code>gemini-2.5-flash</code>，需要支持 Function Calling 的模型。
                </p>
                <input
                  id="gemini-agent-model"
                  value={draft.geminiAgentModel}
                  onChange={(e) => updateDraft("geminiAgentModel", e.target.value)}
                  placeholder="gemini-2.5-flash"
                  className={`${inputClassName} mt-2`}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={saving}
                />
              </div>
            )}
          </div>
        </div>

        <div className="my-6 border-b border-gray-800/60" />

        {/* ----------------------------------------------------------------- */}
        {/* Section 1: API Key + Base URL */}
        {/* ----------------------------------------------------------------- */}
        <div className={draft.agentOrchestrator === "gemini" ? "opacity-50" : ""}>
          <SectionHeading
            title="API 凭证 (Claude)"
            description="Anthropic API 密钥是 Claude 智能体运行的必要条件"
          />

          {/* API Key card */}
          <div className={`${cardClassName} space-y-4`}>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="agent-anthropic-key" className="text-sm font-medium text-gray-100">
                  API Key
                </label>
                {settings.anthropic_api_key.is_set && (
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="truncate">
                      当前：{settings.anthropic_api_key.masked ?? "已设置"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void handleClearField(
                          "anthropic_api_key",
                          { anthropic_api_key: "" },
                          "Anthropic API Key",
                        )
                      }
                      disabled={isBusy}
                      className={inlineClearClassName}
                      aria-label="清除已保存的 Anthropic API Key"
                    >
                      {clearingField === "anthropic_api_key" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                对应环境变量 ANTHROPIC_API_KEY
              </p>
              <div className="relative mt-2">
                <input
                  id="agent-anthropic-key"
                  type={showKey ? "text" : "password"}
                  value={draft.anthropicKey}
                  onChange={(e) => updateDraft("anthropicKey", e.target.value)}
                  placeholder="sk-ant-…"
                  className={`${inputClassName} pr-10`}
                  autoComplete="off"
                  spellCheck={false}
                  name="anthropic_api_key"
                  disabled={saving}
                />
                {draft.anthropicKey && (
                  <button
                    type="button"
                    onClick={() => updateDraft("anthropicKey", "")}
                    className={`absolute right-8 top-1/2 -translate-y-1/2 ${smallBtnClassName}`}
                    aria-label="清除输入"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${smallBtnClassName}`}
                  aria-label={showKey ? "隐藏密钥" : "显示密钥"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Base URL */}
            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-center justify-between">
                <label htmlFor="agent-base-url" className="text-sm font-medium text-gray-100">
                  Base URL
                </label>
                {settings.anthropic_base_url && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleClearField(
                        "anthropic_base_url",
                        { anthropic_base_url: "" },
                        "Anthropic Base URL",
                      )
                    }
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 rounded text-xs text-gray-600 transition-colors hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none"
                    aria-label="清除已保存的 Anthropic Base URL"
                  >
                    {clearingField === "anthropic_base_url" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    清除已保存
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                对应 ANTHROPIC_BASE_URL，留空使用官方默认地址
              </p>
              <div className="relative mt-2">
                <input
                  id="agent-base-url"
                  value={draft.anthropicBaseUrl}
                  onChange={(e) => updateDraft("anthropicBaseUrl", e.target.value)}
                  placeholder="https://anthropic-proxy.example.com"
                  className={`${inputClassName}${draft.anthropicBaseUrl ? " pr-8" : ""}`}
                  autoComplete="off"
                  spellCheck={false}
                  name="anthropic_base_url"
                  disabled={saving}
                />
                {draft.anthropicBaseUrl && (
                  <button
                    type="button"
                    onClick={() => updateDraft("anthropicBaseUrl", "")}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 ${smallBtnClassName}`}
                    aria-label="清除 Base URL 输入"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Section 2: Model Configuration */}
        {/* ----------------------------------------------------------------- */}
        <div>
          <SectionHeading
            title="模型配置"
            description="指定智能体使用的 Claude 模型。留空则使用 Claude Agent SDK 默认值。"
          />

          <div className={cardClassName}>
            <div className="flex items-center justify-between">
              <label htmlFor="agent-model" className="text-sm font-medium text-gray-100">
                默认模型
              </label>
              {settings.anthropic_model && (
                <button
                  type="button"
                  onClick={() =>
                    void handleClearField(
                      "anthropic_model",
                      { anthropic_model: "" },
                      "ANTHROPIC_MODEL",
                    )
                  }
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 rounded text-xs text-gray-600 transition-colors hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none"
                  aria-label="清除已保存的模型配置"
                >
                  {clearingField === "anthropic_model" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  清除已保存
                </button>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              对应 ANTHROPIC_MODEL，覆盖默认模型
            </p>
            <div className="relative mt-2">
              <input
                id="agent-model"
                value={draft.anthropicModel}
                onChange={(e) => updateDraft("anthropicModel", e.target.value)}
                placeholder="ANTHROPIC_MODEL"
                className={`${inputClassName}${draft.anthropicModel ? " pr-8" : ""}`}
                autoComplete="off"
                spellCheck={false}
                name="anthropic_model"
                disabled={saving}
              />
              {draft.anthropicModel && (
                <button
                  type="button"
                  onClick={() => updateDraft("anthropicModel", "")}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${smallBtnClassName}`}
                  aria-label="清除模型配置输入"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Advanced model routing */}
            <details
              open={modelRoutingExpanded}
              onToggle={(e) => setModelRoutingExpanded(e.currentTarget.open)}
              className="mt-4 rounded-xl border border-gray-800 bg-gray-950/40 p-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-gray-100">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                  高级模型路由
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-800 bg-gray-900 text-gray-500">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      modelRoutingExpanded ? "rotate-180 text-gray-200" : ""
                    }`}
                  />
                </span>
              </summary>
              <p className="mt-2 text-xs text-gray-500">
                Claude Agent SDK 支持按能力等级路由到不同模型。留空则统一使用上方的默认模型。
              </p>
              <div className="mt-4 grid gap-4">
                {MODEL_ROUTING_FIELDS.map(({ key, label, envVar, hint, patchKey }) => {
                  const settingsValue = settings[patchKey];
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-100">{label}</div>
                          <div className="text-xs text-gray-500">{hint}</div>
                        </div>
                        {settingsValue && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleClearField(
                                patchKey,
                                { [patchKey]: "" } as SystemConfigPatch,
                                label,
                              )
                            }
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 text-xs text-gray-600 transition-colors hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none rounded"
                            aria-label={`清除已保存的 ${label}`}
                          >
                            {clearingField === patchKey ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            清除
                          </button>
                        )}
                      </div>
                      <div className="relative mt-1.5">
                        <input
                          value={draft[key]}
                          onChange={(e) => updateDraft(key, e.target.value)}
                          placeholder={envVar}
                          className={`${inputClassName}${draft[key] ? " pr-8" : ""}`}
                          autoComplete="off"
                          spellCheck={false}
                          disabled={saving}
                        />
                        {draft[key] && (
                          <button
                            type="button"
                            onClick={() => updateDraft(key, "")}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 ${smallBtnClassName}`}
                            aria-label={`清除 ${label} 输入`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        </div>

        {/* 高级设置 */}
        <div className={cardClassName}>
          <details>
            <summary className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-gray-200">
              <SlidersHorizontal className="h-4 w-4" />
              高级设置
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  会话清理延迟（秒）
                </label>
                <p className="mt-0.5 text-xs text-gray-500">
                  会话结束后等待此时间再释放资源，再次对话时会自动恢复
                </p>
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={draft.cleanupDelaySeconds}
                  onChange={(e) => updateDraft("cleanupDelaySeconds", e.target.value)}
                  className={`${inputClassName} mt-1.5 max-w-[120px]`}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  最大并发会话数
                </label>
                <p className="mt-0.5 text-xs text-gray-500">
                  同时保持活跃的智能体会话上限，超出时自动释放最久未使用的会话（清理的会话会持久化，下次对话时恢复）
                </p>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={draft.maxConcurrentSessions}
                  onChange={(e) => updateDraft("maxConcurrentSessions", e.target.value)}
                  className={`${inputClassName} mt-1.5 max-w-[120px]`}
                  disabled={saving}
                />
              </div>
            </div>
          </details>
        </div>
      </div>

      <TabSaveFooter
        isDirty={isDirty}
        saving={saving}
        disabled={clearingField !== null}
        error={saveError}
        onSave={() => void handleSave()}
        onReset={handleReset}
      />
    </div>
  );
}
