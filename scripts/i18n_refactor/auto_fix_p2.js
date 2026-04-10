const { Project, SyntaxKind, Node } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({
    tsConfigFilePath: path.join(__dirname, '../../frontend/tsconfig.json'),
    skipFileDependencyResolution: true,
});

const files = [
    "src/components/canvas/lorebook/ClueCard.tsx",
    "src/components/copilot/AgentCopilot.tsx",
    "src/components/layout/ExportScopeDialog.tsx",
    "src/components/layout/UsageDrawer.tsx",
    "src/components/layout/WorkspaceNotificationsDrawer.tsx",
    "src/components/ui/GenerateButton.tsx",
    "src/components/ui/ProviderModelSelect.tsx"
];

files.forEach(f => {
    const sourceFile = project.getSourceFile(path.join(__dirname, '../../frontend', f));
    if (!sourceFile) {
        console.log("Missing", f);
        return;
    }

    const text = sourceFile.getFullText();
    let injected = false;
    
    // Find missing const { t } = useTranslation();
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
        
        // Sometimes it's default exports
        if (!injected) {
            const defaultExport = sourceFile.getDefaultExportSymbol();
            if (defaultExport) {
                const dec = defaultExport.getDeclarations()[0];
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
    
    if (!text.includes('useTranslation') && !text.includes('import { t }')) {
        sourceFile.addImportDeclaration({
            namedImports: ['useTranslation'],
            moduleSpecifier: '@/utils/i18n'
        });
    }

    try { sourceFile.saveSync(); } catch(e){}
});

// Fix ProviderDetail.tsx manually
let pd = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/pages/ProviderDetail.tsx'), 'utf8');
pd = pd.replace('key={t}', 'key={mt}');
fs.writeFileSync(path.join(__dirname, '../../frontend/src/components/pages/ProviderDetail.tsx'), pd, 'utf8');

// Fix ExportScopeDialog "rawt" issue?
// "rawt" happened because string replacement {t("...")} conflicted with "raw". Replace rawt back to raw.
let esd = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/layout/ExportScopeDialog.tsx'), 'utf8');
esd = esd.replace(/String\.rawt/g, 'String.raw');
fs.writeFileSync(path.join(__dirname, '../../frontend/src/components/layout/ExportScopeDialog.tsx'), esd, 'utf8');

console.log("Fixed part 2");
