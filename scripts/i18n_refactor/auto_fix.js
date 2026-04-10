const { Project, SyntaxKind, Node } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({
    tsConfigFilePath: path.join(__dirname, '../../frontend/tsconfig.json'),
    skipFileDependencyResolution: true,
});

const files = [
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
];

files.forEach(f => {
    const sourceFile = project.getSourceFile(path.join(__dirname, '../../frontend', f));
    if (!sourceFile) return;

    // Check if const { t } = useTranslation(); exists anywhere
    const text = sourceFile.getFullText();
    if (!text.includes('useTranslation()')) {
        // Find default export or normal function
        const exports = sourceFile.getExportedDeclarations();
        
        for (const [name, decls] of exports) {
             const decl = decls[0];
             if (Node.isFunctionDeclaration(decl)) {
                 const block = decl.getBody();
                 if (Node.isBlock(block)) {
                     block.insertStatements(0, 'const { t } = useTranslation();');
                 }
             } else if (Node.isVariableDeclaration(decl)) {
                 const init = decl.getInitializer();
                 if (Node.isArrowFunction(init)) {
                     const block = init.getBody();
                     if (Node.isBlock(block)) {
                         block.insertStatements(0, 'const { t } = useTranslation();');
                     }
                 }
             }
        }
    }
    
    // Check if there are OUT-OF-BOUNDS calls
    // It's much easier to just add an import for the standalone if we see any 	( outside
    const imports = sourceFile.getImportDeclarations();
    const hasTImport = imports.some(i => i.getModuleSpecifierValue() === '@/utils/i18n' && i.getNamedImports().some(n => n.getName() === 't' || n.getName() === 't as standaloneT'));

    if (!hasTImport) {
        sourceFile.addImportDeclaration({
            namedImports: ['t as standaloneT'], // call it standaloneT to avoid conflict
            moduleSpecifier: '@/utils/i18n'
        });
        
        // Find global calls to 	(
        sourceFile.forEachDescendant(node => {
            if (Node.isCallExpression(node)) {
                if (node.getExpression().getText() === 't') {
                    // Check if it's outside any function that defines 	
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
                        node.getExpression().replaceWithText('standaloneT');
                    }
                }
            }
        });
    }

    sourceFile.saveSync();
});
console.log("Fixed globally!");
