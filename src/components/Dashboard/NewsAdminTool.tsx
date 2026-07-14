import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Plus, X, Link as LinkIcon, Type, Hash } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { NewsItem } from '../../lib/types';

interface NewsAdminToolProps {
  onPublish: (data: Omit<NewsItem, 'id' | 'date'>) => void;
}

const NewsAdminTool: React.FC<NewsAdminToolProps> = ({ onPublish }) => {
  const { t, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'announcement' as 'urgent' | 'event' | 'announcement',
    mediaUrl: '',
    mediaData: ''
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(isRTL ? 'حجم الملف كبير جداً (الحد الأقصى 50 ميغابايت).' : 'Fichier trop volumineux (Max 50MB).');
          return;
        }

        setIsUploading(true);
        try {
          const { storage } = await import('../../lib/firebase');
          const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
          const fileExt = file.name.split('.').pop();
          const fileName = `news_media/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const mediaRef = ref(storage, fileName);
          
          await uploadBytes(mediaRef, file);
          const url = await getDownloadURL(mediaRef);
          
          setFormData({ ...formData, mediaData: url, mediaUrl: file.name });
          toast.success(isRTL ? 'تم الرفع بنجاح!' : 'Téléchargement réussi !');
        } catch (error) {
          console.error(error);
          toast.error(isRTL ? 'حدث خطأ أثناء الرفع' : 'Erreur lors du téléchargement');
        } finally {
          setIsUploading(false);
        }
      } else {
        toast.error('Format de fichier non supporté. Veuillez choisir une image ou une vidéo.');
        return;
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to read media');
      setIsUploading(false);
    }
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error(t('fill_all_fields'));
      return;
    }

    // YouTube / Media Type Detection
    const youtubeRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\/shorts\/)([^#&?]*).*/;
    const isYoutube = youtubeRegex.test(formData.mediaUrl);
    
    // Determine if it's an uploaded video based on URL or original file name
    const isUploadedVideo = formData.mediaData?.includes('firebasestorage') && 
                            formData.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i);
                            
    const mediaType = (isYoutube || isUploadedVideo) ? 'video' as const : 'link' as const;

    const payload: any = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      mediaUrl: formData.mediaUrl,
      mediaType
    };
    if (formData.mediaData) {
      payload.mediaData = formData.mediaData;
    }

    // State Injection via Dashboard Callback
    onPublish(payload);
    
    // Form Reset
    setFormData({
      title: '',
      description: '',
      category: 'announcement',
      mediaUrl: '',
      mediaData: ''
    });
    
    // Cleanly close panel & reset focus state
    setIsOpen(false);
    toast.success(t('school_news_published') || 'Published!');
  };

  return (
    <div className="mt-4 mb-6">
      {!isOpen ? (
        <Button 
          onClick={() => setIsOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-6 h-12 flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          <span className="font-bold">{t('post_news')}</span>
        </Button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="border-none shadow-2xl shadow-primary/10 rounded-[2rem] bg-white overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900">{t('post_news')}</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsOpen(false)}
                  className="rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                    <Type className="w-3 h-3" />
                    {t('news_title')}
                  </label>
                  <Input 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('news_title')}
                    className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 focus:ring-primary font-bold placeholder:text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                      <Hash className="w-3 h-3" />
                      {t('news_category')}
                    </label>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as 'urgent' | 'event' | 'announcement' })}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 h-12 px-4 font-bold appearance-none focus:ring-primary outline-none"
                      >
                        <option value="urgent">{t('urgent')}</option>
                        <option value="event">{t('event')}</option>
                        <option value="announcement">{t('announcement')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                      <LinkIcon className="w-3 h-3" />
                      Media (URL or File)
                    </label>
                    <div className="flex gap-2">
                      <Input 
                        value={formData.mediaUrl}
                        onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                        placeholder="https://... or select file"
                        className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 focus:ring-primary font-bold placeholder:text-slate-300 flex-1"
                      />
                      <label className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200">
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                        <Plus className="w-5 h-5 text-slate-500" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                    {t('news_description')}
                  </label>
                  <Textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('news_description')}
                    className="rounded-2xl border-slate-100 bg-slate-50/50 min-h-[120px] focus:ring-primary font-medium placeholder:text-slate-300"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsOpen(false)}
                    className="rounded-2xl px-6 h-12 font-bold"
                  >
                    {t('cancel')}
                  </Button>
                  <Button 
                    type="button"
                    onClick={handlePublish}
                    disabled={isUploading}
                    className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-10 h-12 shadow-xl shadow-primary/20 font-black uppercase tracking-[0.1em] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Téléchargement...' : t('publish')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default NewsAdminTool;