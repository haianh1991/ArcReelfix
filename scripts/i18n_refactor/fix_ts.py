import os
import re

files_to_fix = [
    "src/components/pages/CreateProjectModal.tsx",
    "src/components/pages/CredentialList.tsx",
    "src/components/pages/OpenClawModal.tsx",
    "src/components/pages/ProviderDetail.tsx",
    "src/components/pages/ProviderSection.tsx",
    "src/components/pages/settings/CustomProviderDetail.tsx",
    "src/components/pages/settings/MediaModelSection.tsx",
    "src/components/pages/settings/UsageStatsSection.tsx",
    "src/components/ui/GenerateButton.tsx",
    "src/components/ui/ProviderIcon.tsx",
    "src/components/ui/ProviderModelSelect.tsx"
]

def fix_file(file_path):
    with open(f"frontend/{file_path}", 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix naming collision 't => type' in ProviderDetail
    if "ProviderDetail" in file_path:
        content = content.replace("media_types.map((t) => (", "media_types.map((mt) => (")
        # Ensure we replace 	 === "video" with mt === "video" carefully
        content = re.sub(r't === "video"', 'mt === "video"', content)
        content = re.sub(r't === "image"', 'mt === "image"', content)
        content = re.sub(r't === "text"', 'mt === "text"', content)
        content = re.sub(r': t\}', ': mt}', content)

    # Inject const { t } = useTranslation(); at the beginning of exported functions
    def repl(m):
        func_start = m.group(0)
        # Check if already injected
        if "useTranslation" in content[m.end():m.end()+100]:
            return func_start
        return func_start + "\n  const { t } = useTranslation();\n"

    # Match exported functions or default exports
    content = re.sub(r'export (?:default )?function [A-Z_$][a-zA-Z0-9_$]*\(.*?\) *(?:: *React\.ReactNode)? *\{', repl, content)
    
    # Also match forwardRef like export const GenerateButton = forwardRef<...>((props, ref) => {
    content = re.sub(r'export const [A-Z_$][a-zA-Z0-9_$]* = forwardRef<.*?>\(\(.*?\) => \{', repl, content)

    # Some might be export const CredentialList = ({...}) => {
    content = re.sub(r'export const [A-Z_$][a-zA-Z0-9_$]* = \(\{[^\}]*\}\)(?:: *React\.ReactNode)? *=> \{', repl, content)

    # Check if useTranslation import is missing
    if "useTranslation" not in content and 'const { t }' in content:
        content = 'import { useTranslation } from "@/utils/i18n";\n' + content

    with open(f"frontend/{file_path}", 'w', encoding='utf-8') as f:
        f.write(content)

for file in files_to_fix:
    fix_file(file)

print("Fixed TS files!")
