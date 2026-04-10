const fs = require('fs');

["frontend/src/components/copilot/AgentCopilot.tsx", 
 "frontend/src/components/layout/WorkspaceNotificationsDrawer.tsx", 
 "frontend/src/components/ui/GenerateButton.tsx", 
 "frontend/src/components/ui/ProviderModelSelect.tsx"].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (!content.includes('const { t } = useTranslation();')) {
        content = content.replace(/(export (default )?(const \w+ = |function \w+\([^{]*\)\s*{))([^{\n]*{)?/, "$1$4\n  const { t } = useTranslation();\n");
    }
    fs.writeFileSync(f, content);
});

let esd = fs.readFileSync('frontend/src/components/layout/ExportScopeDialog.tsx', 'utf8');
esd = esd.replace(/String\.raw\(.*?"auto\.c_usersyour_username"\)/, "\`C:\\\\Users\\\\YourUsername\\\\AppData\\\\Local\\\\JianyingPro\\\\User Data\\\\Projects\\\\com.lveditor.draft\`");
esd = esd.replace(/t\("auto\.users_yourusername_m"\)/, "\`/Users/YourUsername/Movies/JianyingPro/User Data/Projects/com.lveditor.draft\`");
fs.writeFileSync('frontend/src/components/layout/ExportScopeDialog.tsx', esd, 'utf8');

console.log("part 5 done");
