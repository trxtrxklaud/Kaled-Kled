const fs = require('fs');
let code = fs.readFileSync('src/pages/Communication.tsx', 'utf8');

const triggerTarget = `          <TabsTrigger value="messages" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all font-black text-[10px] uppercase tracking-widest">
            <Mail className={\`w-4 h-4 \${isRTL ? 'ml-2' : 'mr-2'}\`} /> {t('unread_messages')}
          </TabsTrigger>`;

const triggerReplacement = triggerTarget + `\n          {isAdmin && (
            <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all font-black text-[10px] uppercase tracking-widest">
              <Bell className={\`w-4 h-4 \${isRTL ? 'ml-2' : 'mr-2'}\`} /> {isRTL ? 'سجل الإشعارات' : 'Journal Notifs'}
            </TabsTrigger>
          )}`;

if (code.includes(triggerTarget)) {
  code = code.replace(triggerTarget, triggerReplacement);
  fs.writeFileSync('src/pages/Communication.tsx', code);
  console.log("Patched TabsTrigger successfully");
} else {
  console.log("Could not find triggerTarget again");
}
