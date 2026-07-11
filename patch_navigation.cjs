const fs = require('fs');
let code = fs.readFileSync('src/components/Navigation.tsx', 'utf8');

const parentNavs = `  if (useAuth().isParent) {
    filteredNavItems = [
      { icon: LayoutDashboard, label: t('dashboard'), path: '/' }
    ];
  }`;

const newParentNavs = `  if (useAuth().isParent) {
    filteredNavItems = [
      { icon: LayoutDashboard, label: t('dashboard'), path: '/' },
      { icon: Bell, label: isRTL ? 'الإشعارات' : 'Notifications', path: '/notifications' }
    ];
  }`;

if (code.includes(parentNavs)) {
  code = code.replace(parentNavs, newParentNavs);
  code = code.replace("import { LayoutDashboard, Users", "import { LayoutDashboard, Users, Bell");
  fs.writeFileSync('src/components/Navigation.tsx', code);
  console.log("Patched Navigation.tsx successfully");
} else {
  console.log("Could not find parentNavs block in Navigation.tsx");
}
