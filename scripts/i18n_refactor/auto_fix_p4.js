const fs = require('fs');
let esd = fs.readFileSync('frontend/src/components/layout/ExportScopeDialog.tsx', 'utf8');
esd = esd.replace(/String\.rawt/g, 'String.raw');
esd = esd.replace("String.raw\{t(\"auto.c_users_appdatalo\")}\", "String.raw\C:\\Users\\\\?????\\\\AppData\\\\Local\\\\JianyingPro\\\\User Data\\\\Projects\\\\com.lveditor.draft\");
esd = esd.replace("String.raw\{t(\"auto.users_movies_ji\")}\", "String.raw\/Users/?????/Movies/JianyingPro/User Data/Projects/com.lveditor.draft\");
fs.writeFileSync('frontend/src/components/layout/ExportScopeDialog.tsx', esd);

fs.writeFileSync('frontend/src/components/canvas/lorebook/ClueCard.tsx', 
   fs.readFileSync('frontend/src/components/canvas/lorebook/ClueCard.tsx', 'utf8')
      .replace('import { t } from "@/utils/i18n";', '')
      .replace('import { useTranslation } from "@/utils/i18n";', 'import { useTranslation, t as standaloneT } from "@/utils/i18n";')
      .replace(/t\(\"auto\.props\"\)/g, 'standaloneT("auto.props")')
      .replace(/t\(\"auto\.environment\"\)/g, 'standaloneT("auto.environment")')
      .replace('const { t } = useTranslation()', 'const { t } = useTranslation();')
);

fs.writeFileSync('frontend/src/components/layout/UsageDrawer.tsx', 
   fs.readFileSync('frontend/src/components/layout/UsageDrawer.tsx', 'utf8')
      .replace('import { t } from "@/utils/i18n";', '')
      .replace('import { useTranslation } from "@/utils/i18n";', 'import { useTranslation, t as standaloneT } from "@/utils/i18n";')
      .replace(/t\(\"auto\.video\"\)/g, 'standaloneT("auto.video")')
      .replace(/t\(\"auto\.text_1\"\)/g, 'standaloneT("auto.text_1")')
      .replace(/t\(\"auto\.picture_1\"\)/g, 'standaloneT("auto.picture_1")')
      .replace(/export function UsageDrawer/g, 'export function UsageDrawer')
);

["frontend/src/components/copilot/AgentCopilot.tsx", "frontend/src/components/layout/WorkspaceNotificationsDrawer.tsx", "frontend/src/components/ui/GenerateButton.tsx", "frontend/src/components/ui/ProviderModelSelect.tsx"].forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (!content.includes('const { t } = useTranslation();')) {
        content = content.replace(/(export (default |const \w+ = |function \w+\([^{]*\)\s*{))([^{\n]*{)?/, "\n  const { t } = useTranslation();\n");
    }
    if (!content.includes('useTranslation')) {
        content = 'import { useTranslation } from "@/utils/i18n";\n' + content;
    }
    fs.writeFileSync(f, content);
});
console.log("fixed js");
