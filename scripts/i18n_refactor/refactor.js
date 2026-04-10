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

    let needsI18nImport = false;
    let modified = false;

    sourceFile.forEachDescendant(node => {
        let textToReplace = null;
        let isJsxBinding = false;

        if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
            const val = node.getLiteralValue().trim();
            if (val && textToKey[val]) {
                textToReplace = textToKey[val];
                const parent = node.getParent();
                if (Node.isJsxAttribute(parent)) {
                    isJsxBinding = true;
                } else if (Node.isPropertyAssignment(parent) && parent.getNameNode() === node) {
                    textToReplace = null;
                }
            }
        } else if (Node.isJsxText(node)) {
            const val = node.getLiteralText().trim();
            if (val && textToKey[val]) {
                textToReplace = textToKey[val];
                isJsxBinding = true;
            }
        } else if (Node.isTemplateMiddle(node) || Node.isTemplateHead(node) || Node.isTemplateTail(node)) {
            const val = node.getLiteralText().trim();
            if (val && textToKey[val]) {
                textToReplace = textToKey[val];
                isJsxBinding = false;
            }
        }

        if (textToReplace) {
            
            if (Node.isTemplateMiddle(node) || Node.isTemplateHead(node) || Node.isTemplateTail(node)) {
                 console.log("Skipping template part in", filePath);
                 return;
            }

            modified = true;
            if (isJsxBinding) {
                if (Node.isJsxText(node)) {
                    node.replaceWithText(`{t("${textToReplace}")}`);
                } else if (Node.isStringLiteral(node)) {
                    node.replaceWithText(`{t("${textToReplace}")}`);
                }
            } else {
                node.replaceWithText(`t("${textToReplace}")`);
            }
        }
    });

    if (modified) {
        const imports = sourceFile.getImportDeclarations();
        const hasUseTranslationImport = imports.some(i => i.getModuleSpecifierValue() === '@/utils/i18n' && i.getNamedImports().some(n => n.getName() === 'useTranslation'));
        const hasTImport = imports.some(i => i.getModuleSpecifierValue() === '@/utils/i18n' && i.getNamedImports().some(n => n.getName() === 't'));

        if (!hasUseTranslationImport && !hasTImport) {
            sourceFile.addImportDeclaration({
                namedImports: filePath.endsWith('.tsx') ? ['useTranslation'] : ['t'],
                moduleSpecifier: '@/utils/i18n'
            });
        }

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
                           block.insertStatements(0, 'const { t } = useTranslation();');
                       }
                   }
                   injectedReactHook = true;
               }
            });
        }

        // Add standalone import if no valid hook was injected but we did replace strings!
        if (filePath.endsWith('.tsx') && !injectedReactHook && !hasTImport) {
             sourceFile.addImportDeclaration({
                 namedImports: ['t'],
                 moduleSpecifier: '@/utils/i18n'
             });
        }

        try {
            sourceFile.saveSync();
            modifiedFiles++;
        } catch(e) {
            console.error("Failed saving", filePath);
        }
    }
});

console.log("Modified", modifiedFiles, "files.");
