const fs = require('fs');
const path = require('path');

const map = JSON.parse(fs.readFileSync('translation_map.json', 'utf8'));

const newZh = {};
const newEn = {};
const newVi = {};

for (const [zh, data] of Object.entries(map)) {
    newZh[data.key] = zh;
    newEn[data.key] = data.en;
    newVi[data.key] = data.vi;
}

const i18nPath = path.join(__dirname, '../../frontend/src/utils/i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

function injectDict(lang, newDict) {
    const searchStr = `  ${lang}: {\n`;
    const idx = content.indexOf(searchStr);
    if (idx !== -1) {
        let textToInsert = '';
        for (const [k, v] of Object.entries(newDict)) {
            if (!content.includes(`"${k}":`)) {
                textToInsert += `    "${k}": ${JSON.stringify(v)},\n`;
            }
        }
        content = content.slice(0, idx + searchStr.length) + textToInsert + content.slice(idx + searchStr.length);
    }
}

injectDict('zh', newZh);
injectDict('en', newEn);
injectDict('vi', newVi);

if (!content.includes('export function t(key: string, fallback?: string)')) {
    const standaloneT = `\n
export function t(key: string, fallback?: string): string {
  const language = useI18nStore.getState().language;
  const translation = dict[language] as Record<string, string>;
  return translation[key] || fallback || key;
}
`;
    content += standaloneT;
}

fs.writeFileSync(i18nPath, content);
console.log('Updated i18n.ts dictionary!');
