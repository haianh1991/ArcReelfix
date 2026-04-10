const { Project, Node } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({
    tsConfigFilePath: path.join(__dirname, '../../frontend/tsconfig.json'),
    skipFileDependencyResolution: true,
});

const extracted = {};
const isChinese = (str) => /[\u4E00-\u9FFF]/.test(str);

project.getSourceFiles().forEach(sourceFile => {
    const filePath = sourceFile.getFilePath();
    if (!filePath.includes('frontend/src') || filePath.includes('.test.') || filePath.includes('i18n.ts') || filePath.includes('components/pages/settings/CustomProviderForm.tsx')) return;

    sourceFile.forEachDescendant(node => {
        let textToExtract = null;

        if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
            const val = node.getLiteralValue();
            if (isChinese(val)) textToExtract = val.trim();
        } else if (Node.isJsxText(node)) {
            const val = node.getLiteralText().trim();
            if (val && isChinese(val)) textToExtract = val;
        } else if (Node.isTemplateMiddle(node) || Node.isTemplateHead(node) || Node.isTemplateTail(node)) {
             const val = node.getLiteralText();
             if (isChinese(val)) textToExtract = val.trim();
        }

        if (textToExtract) {
            if (!extracted[textToExtract]) {
                extracted[textToExtract] = [];
            }
            if (!extracted[textToExtract].includes(filePath)) {
                extracted[textToExtract].push(filePath);
            }
        }
    });

    // Also look for JSXAttributes that might be missing? No, they wrap StringLiteral.
});

fs.writeFileSync('extracted.json', JSON.stringify(extracted, null, 2));
console.log('Done mapping AST! Unique UI strings:', Object.keys(extracted).length);
