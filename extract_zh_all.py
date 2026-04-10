import json
import re
import os

results = {}
for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                zh_lines = [line.strip() for line in lines if re.search(r'[\u4E00-\u9FFF]', line) and not line.strip().startswith('//') and not line.strip().startswith('/*') and not line.strip().startswith('*')]
                if zh_lines:
                    results[path.replace('\\\\', '/')] = zh_lines

with open('zh_strings_all.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print("Found Chinese in", len(results), "files.")
