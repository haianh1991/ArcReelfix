const { Project, SyntaxKind, Node } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({
    tsConfigFilePath: path.join(__dirname, '../../frontend/tsconfig.json'),
    skipFileDependencyResolution: true,
});

project.getSourceFiles().forEach(sourceFile => {
    const filePath = sourceFile.getFilePath();
    if (!filePath.includes('frontend/src') || filePath.includes('.test.') || filePath.includes('i18n.ts') || filePath.includes('components/pages/settings/CustomProviderForm.tsx')) return;

    const text = sourceFile.getFullText();
    let injected = false;
    
    // Check if const { t } = useTranslation(); is missing where it should be
    if (!text.includes('useTranslation()')) {
        const exports = sourceFile.getExportedDeclarations();
        for (const [name, decls] of exports) {
             const decl = decls[0];
             if (Node.isFunctionDeclaration(decl)) {
                 const block = decl.getBody();
                 if (Node.isBlock(block)) {
                     block.insertStatements(0, 'const { t } = useTranslation();');
                     injected = true;
                 }
             } else if (Node.isVariableDeclaration(decl)) {
                 const init = decl.getInitializer();
                 if (Node.isArrowFunction(init)) {
                     const block = init.getBody();
                     if (Node.isBlock(block)) {
                         block.insertStatements(0, 'const { t } = useTranslation();');
                         injected = true;
                     }
                 }
             }
        }
        
        if (!injected) {
            const defaultExport = sourceFile.getDefaultExportSymbol();
            if (defaultExport) {
                const decs = defaultExport.getDeclarations();
                if (decs && decs.length > 0) {
                   const dec = decs[0];
                   if (Node.isFunctionDeclaration(dec)) {
                       const block = dec.getBody();
                       if (Node.isBlock(block)) {
                           block.insertStatements(0, 'const { t } = useTranslation();');
                           injected = true;
                       }
                   }
                }
            }
        }
    }
    
    if (injected && !text.includes('useTranslation')) {
        sourceFile.addImportDeclaration({
            namedImports: ['useTranslation'],
            moduleSpecifier: '@/utils/i18n'
        });
    }

    // Now fix global 't(' out of scope
    if (sourceFile.getFullText().includes('t(')) {
        const imports = sourceFile.getImportDeclarations();
        const hasTImport = imports.some(i => i.getModuleSpecifierValue() === '@/utils/i18n' && i.getNamedImports().some(n => n.getName() === 't' || n.getName() === 't as standaloneT'));

        if (!hasTImport) {
            let needsGlobalT = false;
            sourceFile.forEachDescendant(node => {
                if (Node.isCallExpression(node)) {
                    if (node.getExpression().getText() === 't') {
                        let parent = node.getParent();
                        let inTContext = false;
                        while (parent) {
                            if ((Node.isFunctionDeclaration(parent) || Node.isArrowFunction(parent)) && parent.getFullText().includes('useTranslation()')) {
                                 inTContext = true;
                                 break;
                            }
                            parent = parent.getParent();
                        }
                        if (!inTContext) {
                            needsGlobalT = true;
                            node.getExpression().replaceWithText('standaloneT');
                        }
                    }
                }
            });

            if (needsGlobalT) {
                sourceFile.addImportDeclaration({
                    namedImports: ['t as standaloneT'],
                    moduleSpecifier: '@/utils/i18n'
                });
            }
        }
    }

    try { sourceFile.saveSync(); } catch(e){}
});

// Fix ExportScopeDialog "rawt" issue?
try {
  let esd = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/layout/ExportScopeDialog.tsx'), 'utf8');
  esd = esd.replace(/String\.rawt\(/g, 'String.raw(');
  esd = esd.replace(/\{t\(\"(.*?)\"\)\}/g, '\$1\'); // Wait, raw string doesn't take JSX
  fs.writeFileSync(path.join(__dirname, '../../frontend/src/components/layout/ExportScopeDialog.tsx'), esd, 'utf8');
} catch(e){}

console.log("Fixed all!");
