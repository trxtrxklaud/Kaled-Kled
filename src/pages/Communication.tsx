import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Clock, 
  Send,
  Mail,
  Inbox,

  Phone,
  MessageCircle,
  Smartphone,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { safeOpenExternalLink } from '../lib/utils';

const Communication: React.FC = () => {
  const { announcements, messages, addAnnouncement, deleteAnnouncement, markMessageRead, addMessage } = useData();
  const { isAdmin } = useAuth();
  const { t, isRTL } = useLanguage();
  
  const [, setActiveTab] = useState('announcements');
  const [isAddAnnOpen, setIsAddAnnOpen] = useState(false);
  const [isNewMsgOpen, setIsNewMsgOpen] = useState(false);

  const [annForm, setAnnForm] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'urgent' | 'normal' | 'info'
  });

  const [msgForm, setMsgForm] = useState({
    name: '',
    subject: '',
    message: ''
  });

  const handleAddAnn = (e: React.FormEvent) => {
    e.preventDefault();
    addAnnouncement({
      ...annForm,
      date: new Date().toISOString()
    });
    setIsAddAnnOpen(false);
    setAnnForm({ title: '', content: '', priority: 'normal' });
  };

  const handleSendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    addMessage(msgForm);
    setIsNewMsgOpen(false);
    setMsgForm({ name: '', subject: '', message: '' });
  };

  const handleSchoolContact = (type: 'tel' | 'wa' | 'fb') => {
    const numbers = {
       tel: '0522001122',
       wa: '0661223344',
       fb: 'ComplexeLaProvidence'
    };
    if (type === 'tel') safeOpenExternalLink(`tel:${numbers.tel}`);
    if (type === 'wa') safeOpenExternalLink(`https://wa.me/212661223344`);
    if (type === 'fb') safeOpenExternalLink(`https://m.me/ComplexeLaProvidence`);
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : ''}`}>
      <div className="flex items-center gap-3">
         <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
            <MessageSquare className="w-5 h-5" />
         </div>
         <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('communication')}</h2>
      </div>

      {/* School Contact Section - New Premium Feature */}
      <section className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
             <Smartphone className="w-4 h-4 text-accent" /> {isRTL ? 'اتصال مباشر بالمدرسة' : 'Contact École'}
          </h3>
          <div className="grid grid-cols-3 gap-4">
             <Button 
               variant="ghost" 
               className="flex flex-col gap-3 h-auto py-6 rounded-3xl bg-blue-50/50 hover:bg-blue-100 border border-blue-100 shadow-sm group transition-all"
               onClick={() => handleSchoolContact('fb')}
             >
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                   <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">{t('messenger')}</span>
             </Button>
             <Button 
               variant="ghost" 
               className="flex flex-col gap-3 h-auto py-6 rounded-3xl bg-green-50/50 hover:bg-green-100 border border-green-100 shadow-sm group transition-all"
               onClick={() => handleSchoolContact('wa')}
             >
                <div className="p-3 bg-green-600 rounded-2xl text-white shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                   <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-green-700">{t('whatsapp')}</span>
             </Button>
             <Button 
               variant="ghost" 
               className="flex flex-col gap-3 h-auto py-6 rounded-3xl bg-primary/5 hover:bg-primary/10 border border-primary/10 shadow-sm group transition-all"
               onClick={() => handleSchoolContact('tel')}
             >
                <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                   <Phone className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">{t('call')}</span>
             </Button>
          </div>
        </div>
      </section>

      <Tabs defaultValue="announcements" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-14 bg-white p-1 shadow-sm rounded-2xl mb-8">
          <TabsTrigger value="announcements" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all font-black text-[10px] uppercase tracking-widest">
            <Bell className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} /> {t('announcements')}
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all font-black text-[10px] uppercase tracking-widest">
            <Mail className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} /> {t('unread_messages')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{isRTL ? 'آخر الأخبار' : 'Dernières Nouvelles'}</h3>
            {isAdmin && (
              <Button size="sm" className="h-9 bg-primary text-[10px] font-black uppercase tracking-widest rounded-xl px-4 shadow-lg shadow-primary/20" onClick={() => setIsAddAnnOpen(true)}>
                <Plus className="w-3 h-3 mr-1" /> {t('new_announcement')}
              </Button>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {announcements.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">{t('no_data')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <motion.div key={ann.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className={`border-none shadow-lg shadow-slate-200/40 rounded-[2rem] relative overflow-hidden bg-white border-l-8 ${
                      ann.priority === 'urgent' ? 'border-l-rose-500' : 
                      ann.priority === 'info' ? 'border-l-blue-500' : 'border-l-slate-400'
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                             <h4 className="text-base font-black text-slate-900 tracking-tight">{ann.title}</h4>
                             {ann.priority === 'urgent' && <Badge variant="destructive" className="h-4 text-[8px] font-black uppercase px-2 rounded-sm shadow-sm animate-pulse">{t('urgent')}</Badge>}
                          </div>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 rounded-xl hover:bg-rose-50 -mt-1 -mr-2" onClick={() => deleteAnnouncement(ann.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{ann.content}</p>
                        <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 p-2 rounded-lg w-fit">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {new Date(ann.date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{isRTL ? 'البريد الوارد' : 'Boîte de Réception'}</h3>
            <Button size="sm" variant="outline" className="h-9 rounded-xl border-primary/20 text-primary font-black uppercase tracking-widest text-[10px] px-4" onClick={() => setIsNewMsgOpen(true)}>
              <Send className={`w-3.5 h-3.5 ${isRTL ? 'ml-2' : 'mr-2'}`} /> {isRTL ? 'مراسلة' : 'Envoyer'}
            </Button>
          </div>

          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">{t('no_data')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <motion.div key={msg.id} layout initial={{ opacity: 0, x: isRTL ? 15 : -15 }} animate={{ opacity: 1, x: 0 }}>
                    <Card 
                      className={`border-none shadow-lg shadow-slate-200/40 rounded-[2.5rem] cursor-pointer transition-all hover:shadow-2xl overflow-hidden ${msg.read ? 'bg-slate-50/40 border border-slate-100' : 'bg-white ring-4 ring-primary/5'}`}
                      onClick={() => markMessageRead(msg.id)}
                    >
                      <CardContent className="p-6 flex gap-5">
                        <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center font-black text-xl shadow-inner ${msg.read ? 'bg-slate-200 text-slate-400' : 'bg-primary text-white shadow-xl shadow-primary/20'}`}>
                          {msg.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className={`text-base truncate tracking-tight ${msg.read ? 'text-slate-500 font-bold' : 'text-slate-900 font-black'}`}>{msg.name}</h4>
                            <span className="text-[10px] font-black text-slate-400 whitespace-nowrap bg-slate-100/50 px-2 py-0.5 rounded-lg">{new Date(msg.timestamp).toLocaleTimeString(isRTL ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className={`text-xs truncate uppercase tracking-widest font-black ${msg.read ? 'text-slate-400' : 'text-primary'}`}>{msg.subject}</p>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-3 leading-relaxed">{msg.message}</p>
                        </div>
                        {!msg.read && <div className="w-2.5 h-2.5 bg-accent rounded-full mt-2 animate-pulse" />}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Add Announcement Dialog */}
      <Dialog open={isAddAnnOpen} onOpenChange={setIsAddAnnOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">{t('new_announcement')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAnn} className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'العنوان' : 'Titre'}</Label>
                <Input className="h-12 rounded-2xl bg-slate-50 border-slate-200" value={annForm.title} onChange={e => setAnnForm({...annForm, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'الأولوية' : 'Priorité'}</Label>
                <div className="flex gap-2">
                  {['info', 'normal', 'urgent'].map((p) => (
                    <Button 
                      key={p} 
                      type="button" 
                      variant={annForm.priority === p ? 'default' : 'outline'}
                      className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${annForm.priority === p && p === 'urgent' ? 'bg-rose-500 shadow-lg shadow-rose-200' : ''}`}
                      onClick={() => setAnnForm({...annForm, priority: p as 'urgent' | 'normal' | 'info'})}
                    >
                      {p === 'info' ? t('info') : p === 'urgent' ? t('urgent') : t('normal')}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'التفاصيل' : 'Contenu'}</Label>
                <Textarea className="rounded-2xl bg-slate-50 border-slate-200 min-h-[120px]" rows={4} value={annForm.content} onChange={e => setAnnForm({...annForm, content: e.target.value})} required />
              </div>
            </div>
            <DialogFooter className="pt-6 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddAnnOpen(false)} className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-xs">{t('cancel')}</Button>
              <Button type="submit" className="flex-1 h-12 rounded-2xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">{t('send')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Message Dialog */}
      <Dialog open={isNewMsgOpen} onOpenChange={setIsNewMsgOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">{isRTL ? 'إرسال رسالة' : 'Envoyer un message'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendMsg} className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'الاسم' : 'Votre Nom'}</Label>
                <Input className="h-12 rounded-2xl bg-slate-50 border-slate-200" value={msgForm.name} onChange={e => setMsgForm({...msgForm, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('subject')}</Label>
                <Input className="h-12 rounded-2xl bg-slate-50 border-slate-200" value={msgForm.subject} onChange={e => setMsgForm({...msgForm, subject: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'نص الرسالة' : 'Message'}</Label>
                <Textarea className="rounded-2xl bg-slate-50 border-slate-200 min-h-[120px]" rows={4} value={msgForm.message} onChange={e => setMsgForm({...msgForm, message: e.target.value})} required />
              </div>
            </div>
            <DialogFooter className="pt-6 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsNewMsgOpen(false)} className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-xs">{t('cancel')}</Button>
              <Button type="submit" className="flex-1 h-12 rounded-2xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">{t('send')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Communication;