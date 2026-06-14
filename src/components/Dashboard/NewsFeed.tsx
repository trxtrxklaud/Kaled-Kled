import React from 'react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  ExternalLink, 
  MoreVertical, 
  Trash2,
  Video,
  Link as LinkIcon
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { useAuth } from '../../contexts/AuthContext';

const NewsFeed: React.FC = () => {
  const { news, deleteNews } = useData();
  const { t, isRTL } = useLanguage();
  const { isAdmin, isStaff } = useAuth();
  const canManage = isAdmin || isStaff;

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="bg-accent/10 p-2 rounded-xl text-accent">
          <Calendar className="w-4 h-4" />
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{t('school_news')}</h3>
      </div>

      <div className="flex flex-col gap-6">
        {news.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm">
            <p className="text-sm text-slate-400 italic">{t('no_data')}</p>
          </div>
        ) : (
          news.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden group">
                <CardContent className="p-0">
                  {/* Media Content */}
                  {item.mediaUrl && item.mediaType === 'video' && getYouTubeId(item.mediaUrl) ? (
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                      <iframe
                        className="absolute top-0 left-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${getYouTubeId(item.mediaUrl)}?rel=0&modestbranding=1`}
                        title={item.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  ) : item.mediaUrl ? (
                    <div className="p-8 pb-0">
                      <div 
                        className="bg-slate-50 border border-slate-100 rounded-3xl p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-all group/link"
                        onClick={() => window.open(item.mediaUrl, '_blank')}
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="bg-white p-3 rounded-2xl shadow-sm shrink-0 text-primary group-hover/link:bg-primary group-hover/link:text-white transition-colors">
                             {item.mediaType === 'video' ? <Video className="w-6 h-6" /> : <LinkIcon className="w-6 h-6" />}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">SOURCE EXTERNE</p>
                            <p className="text-sm font-bold text-primary truncate">{item.mediaUrl}</p>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded-xl text-slate-300 group-hover/link:text-primary transition-colors">
                           <ExternalLink className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Text Content */}
                  <div className="p-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`
                            px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider
                            ${
                              item.category === 'urgent' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 
                              item.category === 'event' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 
                              'bg-primary text-white shadow-lg shadow-primary/20'
                            }
                          `}
                        >
                          {t(item.category)}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                           <Calendar className="w-3 h-3" />
                           {new Date(item.date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="rounded-xl">
                            <DropdownMenuItem 
                              className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                              onClick={() => deleteNews(item.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {(item.mediaData || item.mediaUrl) && (item.mediaType === 'link' || !item.mediaType) && (
                      <div className="mt-3">
                        {item.mediaData ? (
                          <img 
                            src={item.mediaData} 
                            alt={item.title} 
                            className="w-full max-h-64 object-cover rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow" 
                            onClick={() => window.open(item.mediaData, '_blank')}
                          />
                        ) : (
                          <Button 
                            variant="ghost" 
                            className="p-0 h-auto text-primary font-black text-xs hover:bg-transparent hover:text-primary/80 flex items-center gap-2 group/btn print:hidden"
                            onClick={() => window.open(item.mediaUrl, '_blank')}
                          >
                            {t('read_more')} 
                            <ExternalLink className="w-3 h-3 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default NewsFeed;