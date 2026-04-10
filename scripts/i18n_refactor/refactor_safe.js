const { Project, SyntaxKind, Node } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({
    tsConfigFilePath: path.join(__dirname, '../../frontend/tsconfig.json'),
    skipFileDependencyResolution: true,
});

const map = JSON.parse(fs.readFileSync('translation_map.json', 'utf8'));

const textToKey = {};
for (const [zh, trans] of Object.entries(map)) {
    textToKey[zh.trim()] = trans.key;
}

let modifiedFiles = 0;

project.getSourceFiles().forEach(sourceFile => {
    const filePath = sourceFile.getFilePath();
    if (!filePath.includes('frontend/src') || filePath.includes('.test.') || filePath.includes('i18n.ts') || filePath.includes('components/pages/settings/CustomProviderForm.tsx')) return;

    let modified = false;
    const replacements = [];
    
    sourceFile.forEachDescendant(node => {
        let textToReplaceKey = null;
        let replaceWithText = null;
        let isJsxBinding = false;

        if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
            const val = node.getLiteralValue().trim();
            if (val && textToKey[val]) {
                const parent = node.getParent();
                if (Node.isPropertyAssignment(parent) && parent.getNameNode() === node) {
                    return; // skip object property keys
                }
                
                textToReplaceKey = textToKey[val];
                if (Node.isJsxAttribute(parent)) {
                    replaceWithText = `{t("${textToReplaceKey}")}`;
                } else {
                    replaceWithText = `t("${textToReplaceKey}")`;
                }
                replacements.push({ start: node.getStart(), end: node.getEnd(), text: replaceWithText });
            }
        } else if (Node.isJsxText(node)) {
            const val = node.getLiteralText().trim();
            if (val && textToKey[val]) {
                const fullText = node.getFullText();
                const textOnly = node.getLiteralText();
                // To preserve surrounding whitespace, we only replace the literal text portion
                const startOff = fullText.indexOf(val);
                if (startOff !== -1) {
                    const absStart = node.getFullStart() + startOff;
                    const absEnd = absStart + val.length;
                    replacements.push({ start: absStart, end: absEnd, text: `{t("${textToKey[val]}")}` });
                }
            }
        }
    });

    if (replacements.length > 0) {
        // Collect hooks injections
        const imports = sourceFile.getImportDeclarations();
        const hasUseTranslationImport = imports.some(i => i.getModuleSpecifierValue() === '@/utils/i18n' && i.getNamedImports().some(n => n.getName() === 'useTranslation'));
        const hasTImport = imports.some(i => i.getModuleSpecifierValue() === '@/utils/i18n' && i.getNamedImports().some(n => n.getName() === 't'));

        let injectedReactHook = false;
        if (filePath.endsWith('.tsx')) {
            const functions = [...sourceFile.getFunctions(), ...sourceFile.getVariableDeclarations().filter(v => v.getInitializer() && Node.isArrowFunction(v.getInitializer())).map(v => v.getInitializer())];
            
            functions.forEach(func => {
               let isComponent = false;
               if (Node.isFunctionDeclaration(func) && func.getName() && /^[A-Z]/.test(func.getName())) isComponent = true;
               if (Node.isArrowFunction(func)) {
                   const parentVal = func.getParent();
                   if (Node.isVariableDeclaration(parentVal) && /^[A-Z]/.test(parentVal.getName())) isComponent = true;
               }

               if (isComponent) {
                   const text = func.getBodyText() || "";
                   if (!text.includes('useTranslation()')) {
                       const block = func.getBody();
                       if (Node.isBlock(block)) {
                           replacements.push({ 
                               start: block.getStart() + 1, 
                               end: block.getStart() + 1, 
                               text: `\n  const { t } = useTranslation();\n` 
                           });
                           injectedReactHook = true;
                       }
                   } else {
                       injectedReactHook = true;
                   }
               }
            });
        }

        // Add imports
        const lastImportLinePos = imports.length > 0 ? imports[imports.length - 1].getEnd() : 0;
        
        if (filePath.endsWith('.tsx') && !hasUseTranslationImport) {
            replacements.push({ 
                 start: lastImportLinePos, 
                 end: lastImportLinePos, 
                 text: `\nimport { useTranslation } from "@/utils/i18n";\n` 
            });
        } else if (!filePath.endsWith('.tsx') && !hasTImport) {
            replacements.push({ 
                 start: lastImportLinePos, 
                 end: lastImportLinePos, 
                 text: `\nimport { t } from "@/utils/i18n";\n` 
            });
        }
        
        // Sort replacements descending by start to avoid index shifting
        replacements.sort((a, b) => b.start - a.start);
        
        // Deduplicate replacements (if any overlap happens, skip)
        const validReplacements = [];
        let lastStart = Infinity;
        for (const r of replacements) {
            if (r.end <= lastStart) {
                validReplacements.push(r);
                lastStart = r.start;
            }
        }
        
        let fileContent = sourceFile.getFullText();
        for (const r of validReplacements) {
            fileContent = fileContent.slice(0, r.start) + r.text + fileContent.slice(r.end);
        }
        
        fs.writeFileSync(filePath, fileContent, "utf8");
        modifiedFiles++;
    }
});

console.log("Modified", modifiedFiles, "files.");
