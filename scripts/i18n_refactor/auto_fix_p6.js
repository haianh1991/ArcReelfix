const fs = require('fs');

function replaceGlobalT(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add standaloneT
    if (content.includes('t(') && !content.includes('standaloneT')) {
        content = content.replace('import { useTranslation }', 'import { useTranslation, t as standaloneT }');
        
        // Find definitions OUTSIDE of the component
        // E.g. const TYPE_LABELS ... = { prop: t("auto.props") }
        // Let's just simply regex the known ones!
        content = content.replace(/prop: t\(/g, 'prop: standaloneT(');
        content = content.replace(/location: t\(/g, 'location: standaloneT(');
        
        // UsageDrawer
        content = content.replace(/label: t\(/g, 'label: standaloneT(');
    }
    fs.writeFileSync(filePath, content);
}

replaceGlobalT('frontend/src/components/canvas/lorebook/ClueCard.tsx');
replaceGlobalT('frontend/src/components/layout/UsageDrawer.tsx');


// For the other files, there's no const { t } = useTranslation(); because my script failed to inject it.
function injectT(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('const { t } = useTranslation();')) {
        // Find the beginning of the component block
        content = content.replace(/(export (default )?(const [A-Za-z0-9_]+ = \(|function [A-Za-z0-9_]+\([^{]*\)\s*{|const [A-Za-z0-9_]+ = forwardRef<.*?>\(\(.*?\) => {))/, "\\n  const { t } = useTranslation();\n");
    }
    fs.writeFileSync(filePath, content);
}

injectT('frontend/src/components/copilot/AgentCopilot.tsx');
injectT('frontend/src/components/layout/WorkspaceNotificationsDrawer.tsx');
injectT('frontend/src/components/ui/GenerateButton.tsx');
injectT('frontend/src/components/ui/ProviderModelSelect.tsx');

console.log("fixed p6");
