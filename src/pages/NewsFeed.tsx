import React, { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Upload, 
  X, 
  Send,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import type { Post } from '../lib/types';
import { toast } from 'sonner';
import { Lightbox } from '../components/ui/lightbox';
import { getAvatarUrl } from '../lib/utils';

const CLASSES = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '5A', '6A'];
const AUDIENCE_OPTIONS = ['Tout le monde', 'Enseignants', 'Parents', 'Classes spécifiques'];

const NewsFeed: React.FC = () => {
  const { t } = useLanguage();
  const { posts, addPost, likePost, addComment, editPost, deletePost } = useData();

  // Current user simulation (for permissions)
  const currentUserRole = 'Administrateur';
  const currentUserName = 'Mme. Fatima Zahra';

  // Form states for new post
  const [newContent, setNewContent] = useState('');
  const [newAudience, setNewAudience] = useState('Tout le monde');
  const [newSelectedClasses, setNewSelectedClasses] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Interaction states
  const [expandedPosts, setExpandedPosts] = useState<{[key: string]: boolean}>({});
  const [commentText, setCommentText] = useState<{[key: string]: string}>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);

  // Edit/Delete states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editAudience, setEditAudience] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  const isAdmin = currentUserRole === 'Administrateur';

  // Handle file upload with dynamic previews
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newPreviews: string[] = [];

    try {
      const { compressImageFile } = await import('../lib/imageCompressor');
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          const data = await compressImageFile(file, 1600, 0.7);
          newPreviews.push(data);
        }
      }
      setNewImages(prev => [...prev, ...newPreviews]);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du traitement des images');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  // Publish new post
  const handlePublishPost = () => {
    if (!newContent.trim()) return;

    const audienceLabel = newAudience === 'Classes spécifiques' 
      ? `Classes: ${newSelectedClasses.join(', ')}` 
      : newAudience;

    addPost({
      author: currentUserName,
      role: currentUserRole,
      content: newContent.trim(),
      audience: audienceLabel,
      images: [...newImages],
    });
    
    setNewContent('');
    setNewAudience('Tout le monde');
    setNewSelectedClasses([]);
    setNewImages([]);
  };

  // Like toggle
  const handleLike = (postId: string) => {
    likePost(postId);
  };

  // Add comment
  const handleAddComment = (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    addComment(postId, {
      author: currentUserName,
      role: currentUserRole,
      text,
    });

    setCommentText(prev => ({ ...prev, [postId]: '' }));
  };

  // Toggle expandable text
  const toggleExpand = (postId: string) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Open edit dialog
  const openEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setEditAudience(post.audience);
    setEditImages([...post.images]);
    setOpenMenuId(null);
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingPostId || !editContent.trim()) return;

    editPost(editingPostId, {
      content: editContent.trim(),
      audience: editAudience,
      images: [...editImages]
    });

    setEditingPostId(null);
    setEditContent('');
    setEditAudience('');
    setEditImages([]);
  };

  // Delete post
  const handleDeletePost = (postId: string) => {
    deletePost(postId);
    setDeletePostId(null);
    setOpenMenuId(null);
  };

  // Toggle menu
  const toggleMenu = (postId: string) => {
    setOpenMenuId(openMenuId === postId ? null : postId);
  };

  // Can user edit/delete this post?
  const canManagePost = (post: Post) => {
    return isAdmin || post.author === currentUserName;
  };

  // Audience selector badges
  const renderAudienceSelector = (
    currentAudience: string, 
    selectedClasses: string[], 
    onAudienceChange: (aud: string) => void,
    onClassesChange: (cls: string[]) => void
  ) => (
    <div className="space-y-3">
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('audience_target')}</Label>
      <div className="flex flex-wrap gap-2">
        {AUDIENCE_OPTIONS.map(option => (
          <Badge
            key={option}
            variant={currentAudience === option ? 'default' : 'outline'}
            className={`cursor-pointer py-1 px-3 rounded-xl text-xs font-black transition-all ${currentAudience === option ? 'bg-primary text-white' : 'hover:bg-slate-100'}`}
            onClick={() => onAudienceChange(option)}
          >
            {option}
          </Badge>
        ))}
      </div>
      
      {currentAudience === 'Classes spécifiques' && (
        <div className="grid grid-cols-5 gap-1.5">
          {CLASSES.map(cls => (
            <label 
              key={cls}
              className={`text-xs font-bold p-1.5 rounded-lg border cursor-pointer text-center transition-all ${selectedClasses.includes(cls) ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50 border-slate-200'}`}
            >
              <input 
                type="checkbox" 
                checked={selectedClasses.includes(cls)}
                onChange={() => {
                  const newClasses = selectedClasses.includes(cls) 
                    ? selectedClasses.filter(c => c !== cls)
                    : [...selectedClasses, cls];
                  onClassesChange(newClasses);
                }}
                className="hidden"
              />
              {cls}
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-primary p-2 rounded-xl text-white">
          <MessageCircle className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">{t('news_feed')}</h2>
      {/* Visible action layout for Add/View/Edit/Delete/Close (cleanup) */}
      <div className="flex flex-wrap gap-2 -mt-4">
        <Button onClick={() => { const form = document.querySelector("textarea"); if(form) {form.focus(); form.scrollIntoView({behavior:"smooth"}); } }} variant="outline" size="sm" className="rounded-2xl text-[10px] font-black">+ Nouveau Post (Add)</Button>
        <Button onClick={() => window.scrollTo({top: document.body.scrollHeight, behavior:"smooth"})} variant="outline" size="sm" className="rounded-2xl text-[10px] font-black">Voir tous (View)</Button>
        <Button onClick={() => toast.info("Utilisez le menu ... sur chaque post pour Éditer/Supprimer (Close)")} variant="outline" size="sm" className="rounded-2xl text-[10px] font-black">Actions Éditer/Supprimer</Button>
      </div>
      </div>

      {/* 1. THE INPUT FORM (Nouveau Post) */}
      <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">
              {currentUserName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="font-black text-sm">{currentUserName}</p>
              <p className="text-[10px] text-slate-500">{currentUserRole}</p>
            </div>
          </div>

          <Textarea 
            placeholder="Quoi de neuf ? Partagez une annonce, un rappel ou une photo..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="min-h-[100px] rounded-2xl bg-slate-50 border-slate-200 text-base"
          />

          {/* Target Audience Selector */}
          {renderAudienceSelector(
            newAudience, 
            newSelectedClasses, 
            setNewAudience, 
            setNewSelectedClasses
          )}

          {/* Image/File Upload Zone with Dynamic Previews */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('images_files_optional')}</Label>
            
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center relative group hover:border-primary/30 transition-all">
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Upload className="w-8 h-8 mx-auto text-slate-300 group-hover:text-primary mb-3 transition-colors" />
              <p className="text-sm font-bold text-slate-600">Glissez des images ici ou cliquez pour sélectionner</p>
              <p className="text-[10px] text-slate-400 mt-1">PNG, JPG jusqu'à 5MB</p>
            </div>

            {/* Dynamic Previews Grid */}
            {newImages.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {newImages.map((img, index) => (
                  <div key={index} className="relative rounded-xl overflow-hidden border border-slate-100 group/preview">
                    <img src={img} alt={`Preview ${index}`} className="w-full h-28 object-cover" />
                    <button 
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover/preview:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-rose-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button 
            onClick={handlePublishPost} 
            disabled={!newContent.trim()}
            className="w-full h-12 rounded-2xl bg-primary font-black text-sm tracking-widest"
          >
            {t('publish_post')}
          </Button>
        </CardContent>
      </Card>

      {/* 2. THE FEED LIST (Display) */}
      <div className="space-y-6">
        {posts.length === 0 && (
          <Card className="p-8 text-center rounded-[2.5rem]">
            <p className="text-slate-400">{t('no_posts_yet')}</p>
          </Card>
        )}

        {posts.map((post) => {
          const isExpanded = expandedPosts[post.id] || post.content.length < 180;
          const canManage = canManagePost(post);

          return (
            <Card key={post.id} className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white overflow-hidden">
              <CardContent className="p-0">
                {/* Post Header */}
                <div className="p-6 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden ring-1 ring-slate-200">
                      <img 
                        src={getAvatarUrl(post.author, 'employee')} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/48?text=?"; }} 
                        alt={post.author} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-slate-900">{post.author}</span>
                        <Badge 
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            post.role.includes('Admin') ? 'bg-rose-500 text-white' : 
                            post.role.includes('Prof') ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {post.role}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                        {new Date(post.date).toLocaleDateString('fr-FR', { 
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Audience Badge */}
                  <Badge variant="outline" className="text-[9px] font-black self-start">
                    {post.audience}
                  </Badge>

                  {/* Actions Menu (Ellipsis) */}
                  {canManage && (
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full" 
                        onClick={() => toggleMenu(post.id)}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      
                      {openMenuId === post.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-1">
                          <button 
                            onClick={() => openEdit(post)}
                            className="w-full px-4 py-2.5 text-left text-sm font-bold flex items-center gap-2 hover:bg-slate-50"
                          >
                            <Edit className="w-4 h-4" /> {t('edit_post')}
                          </button>
                          <button 
                            onClick={() => setDeletePostId(post.id)}
                            className="w-full px-4 py-2.5 text-left text-sm font-bold flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" /> {t('delete_post')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="px-6 pb-4">
                  <p className={`text-[15px] text-slate-700 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    {post.content}
                  </p>
                  {post.content.length > 180 && (
                    <button 
                      onClick={() => toggleExpand(post.id)}
                      className="text-xs font-black text-primary mt-1 hover:underline"
                    >
                      {isExpanded ? t('reduce') : t('read_more')}
                    </button>
                  )}
                </div>

                {/* Responsive Image Grid */}
                {post.images.length > 0 && (
                  <div className={`grid ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1 px-6 pb-4`}>
                    {post.images.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="aspect-video rounded-2xl overflow-hidden border border-slate-100 cursor-pointer"
                        onClick={() => setPreviewLightbox(img)}
                      >
                        <img 
                          src={img} 
                          alt={`Post image ${idx}`} 
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Interaction Layers */}
                <div className="border-t px-6 py-4 flex items-center gap-6 text-sm">
                  {/* Likes */}
                  <button 
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 font-black transition-colors ${post.likedByCurrentUser ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}
                  >
                    <Heart className={`w-4 h-4 ${post.likedByCurrentUser ? 'fill-current' : ''}`} />
                    <span>{post.likes}</span>
                  </button>

                  {/* Comments toggle / count */}
                  <button 
                    onClick={() => { /* Could toggle comments visibility */ }}
                    className="flex items-center gap-2 font-black text-slate-500 hover:text-primary"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.comments.length} {t('comment')}</span>
                  </button>
                </div>

                {/* Comments Section */}
                <div className="px-6 pb-6 border-t pt-4 bg-slate-50/50">
                  <div className="space-y-3 mb-4">
                    {post.comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 mt-0.5 overflow-hidden">
                          <img 
                            src={getAvatarUrl(comment.author, 'employee')} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/48?text=?"; }} 
                            alt="" 
                            className="w-full h-full" 
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{comment.author}</span>
                            <Badge className="text-[8px] px-1.5 py-0 font-black bg-emerald-100 text-emerald-700">
                              {comment.role}
                            </Badge>
                            <span className="text-[10px] text-slate-400">{new Date(comment.date).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-sm text-slate-700 mt-0.5">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <Input 
                      placeholder={t('add_comment')}
                      value={commentText[post.id] || ''}
                      onChange={(e) => setCommentText(prev => ({...prev, [post.id]: e.target.value}))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      className="h-10 rounded-2xl bg-white"
                    />
                    <Button 
                      size="icon" 
                      onClick={() => handleAddComment(post.id)}
                      disabled={!commentText[post.id]?.trim()}
                      className="h-10 w-10 rounded-2xl"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPostId} onOpenChange={() => setEditingPostId(null)}>
        <DialogContent className="max-w-lg rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{t('edit_post_title')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <Textarea 
              value={editContent} 
              onChange={(e) => setEditContent(e.target.value)} 
              className="min-h-[120px] rounded-2xl" 
            />
            
            {/* Simplified audience for edit */}
            <div>
              <Label className="text-xs font-black uppercase">{t('audience_target')}</Label>
              <select 
                value={editAudience} 
                onChange={(e) => setEditAudience(e.target.value)}
                className="w-full h-11 mt-2 rounded-2xl border px-4"
              >
                {AUDIENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Image previews in edit */}
            {editImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {editImages.map((img, i) => (
                  <div key={i} className="relative aspect-video rounded-xl overflow-hidden">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setEditImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingPostId(null)}>{t('cancel')}</Button>
            <Button onClick={handleSaveEdit}>{t('save_changes')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <DialogContent className="max-w-sm rounded-[2.5rem] p-8 text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{t('confirm_delete_post')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 my-4">{t('action_irreversible')}</p>
          <DialogFooter className="flex gap-3 justify-center">
            <Button variant="ghost" onClick={() => setDeletePostId(null)}>{t('cancel')}</Button>
            <Button 
              variant="destructive" 
              onClick={() => deletePostId && handleDeletePost(deletePostId)}
            >
              {t('delete_permanently')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Lightbox 
        isOpen={!!previewLightbox} 
        src={previewLightbox} 
        onClose={() => setPreviewLightbox(null)} 
      />
    </div>
  );
};

export default NewsFeed;