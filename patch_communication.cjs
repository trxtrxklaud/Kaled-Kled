const fs = require('fs');
let code = fs.readFileSync('src/pages/Communication.tsx', 'utf8');

// 1. Add imports
const importsTarget = "import { useSchoolStore } from '../stores/schoolStore';";
const importsReplacement = "import { useSchoolStore } from '../stores/schoolStore';\nimport { useNotificationStore } from '../stores/notificationStore';";

// 2. Add state hook
const hooksTarget = "const { announcements, addAnnouncement, deleteAnnouncement } = useSchoolStore();";
const hooksReplacement = "const { announcements, addAnnouncement, deleteAnnouncement } = useSchoolStore();\n  const { events: notifEvents, fetchAllEvents } = useNotificationStore();\n  React.useEffect(() => { if (isAdmin) fetchAllEvents(); }, [isAdmin, fetchAllEvents]);";

// 3. Add Tab Trigger
const triggerTarget = `<TabsTrigger value="messages" className="rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all duration-300 px-6 py-3 font-black uppercase tracking-widest text-[10px]">            <Inbox className="w-3.5 h-3.5 mr-2" /> {isRTL ? 'الرسائل' : 'Messages'}          </TabsTrigger>`;
const triggerReplacement = triggerTarget + `\n          {isAdmin && (
            <TabsTrigger value="notifications" className="rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all duration-300 px-6 py-3 font-black uppercase tracking-widest text-[10px]">
              <Bell className="w-3.5 h-3.5 mr-2" /> {isRTL ? 'سجل الإشعارات' : 'Journal Notifs'}
            </TabsTrigger>
          )}`;

// 4. Add Tab Content
const contentTarget = "</Tabs>";
const contentReplacement = `        <TabsContent value="notifications" className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{isRTL ? 'سجل الإشعارات الفورية' : 'Historique des notifications'}</h3>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm">
            {notifEvents.length === 0 ? (
              <div className="py-20 text-center">
                <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">{t('no_data')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifEvents.map((evt) => (
                  <div key={evt.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-slate-50">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-slate-900">{evt.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{evt.body}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold text-slate-400">
                        <span className="bg-slate-200/50 px-2 py-0.5 rounded-full">{evt.type}</span>
                        <span>{new Date(evt.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
` + contentTarget;

code = code.replace(importsTarget, importsReplacement);
code = code.replace(hooksTarget, hooksReplacement);
if (code.includes(triggerTarget)) {
  code = code.replace(triggerTarget, triggerReplacement);
} else {
  console.log("Could not find triggerTarget");
}
code = code.replace(contentTarget, contentReplacement);

fs.writeFileSync('src/pages/Communication.tsx', code);
console.log("Patched Communication.tsx successfully");
