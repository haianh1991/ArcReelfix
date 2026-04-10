import os, re

files = [
    "src/components/canvas/lorebook/ClueCard.tsx",
    "src/components/copilot/AgentCopilot.tsx",
    "src/components/layout/ExportScopeDialog.tsx",
    "src/components/layout/UsageDrawer.tsx",
    "src/components/layout/WorkspaceNotificationsDrawer.tsx",
    "src/components/ui/GenerateButton.tsx",
    "src/components/ui/ProviderModelSelect.tsx"
]

for f in files:
    with open("frontend/" + f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # 1. Inject import
    if "useTranslation" not in content and "import { t " not in content:
        content = 'import { useTranslation } from "@/utils/i18n";\n' + content
        
    # 2. Inject const { t }
    if "useTranslation()" not in content:
        content = re.sub(
            r'export (const \w+ = [^\n{]+{|\w*function \w+\([^{]*\)\s*{)',
            r'\1\n  const { t } = useTranslation();',
            content
        )
    
    # fix String.rawt
    if "ExportScopeDialog" in f:
        content = content.replace("String.raw{t(\"auto.windows_draft_dir_path\")}", 'String.rawC:\Users\?????\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft')
        content = content.replace("String.raw{t(\"auto.mac_draft_dir_path\")}", 'String.raw/Users/?????/Movies/JianyingPro/User Data/Projects/com.lveditor.draft')
    
    # 3. Global outside-react calls
    if "t(" in content:
        if "import { t as standaloneT" not in content:
            content = 'import { t as standaloneT } from "@/utils/i18n";\n' + content
        # For simplicity, if we see label: t(", we replace with label: standaloneT(" globally, 
        # BUT only if it's declared globally like TYPE_LABELS or CALL_TYPE_CONFIG.
        content = re.sub(r'(\w+:\s*)t\(', r'\1standaloneT(', content)
        content = content.replace('const { standaloneT } = useTranslation()', 'const { t } = useTranslation()') # revert if it replaced inside

    with open("frontend/" + f, 'w', encoding='utf-8') as file:
        file.write(content)

print("Fixed!")
