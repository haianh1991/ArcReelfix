import json
import re

files = [
    'frontend/src/components/pages/SystemConfigPage.tsx',
    'frontend/src/components/pages/AgentConfigTab.tsx',
    'frontend/src/components/pages/ApiKeysTab.tsx',
    'frontend/src/components/pages/ProjectsPage.tsx',
    'frontend/src/components/layout/GlobalHeader.tsx',
    'frontend/src/components/pages/settings/CustomProviderForm.tsx'
]

results = {}
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        zh_lines = [line.strip() for line in lines if re.search(r'[\u4E00-\u9FFF]', line)]
        if zh_lines:
            results[file] = zh_lines

with open('zh_strings.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print("Done")
