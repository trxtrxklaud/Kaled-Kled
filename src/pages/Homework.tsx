import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit, 
  FileText, 
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
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
import { toast } from 'sonner';
import type { Homework } from '../lib/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Lightbox } from '../components/ui/lightbox';
import { downloadFile, safeOpenExternalLink } from '../lib/utils';

// Expanded to 5 sections per grade (A-E) - matching existing CLASSES in project
const CLASSES = [
  '1A', '1B', '1C', '1D', '1E',
  '2A', '2B', '2C', '2D', '2E',
  '3A', '3B', '3C', '3D', '3E',
  '4A', '4B', '4C', '4D', '4E',
  '5A', '5B', '5C', '5D', '5E',
  '6A', '6B', '6C', '6D', '6E'
];
const SESSIONS = ['S1', 'S2', 'Rattrapage'];
const SUBJECTS = [
  'Mathématiques', 'Français', 'Arabe', 'Sciences Physiques', 
  'Histoire-Géographie', 'Anglais', 'Éducation Physique', 
  'Informatique', 'SVT', 'Philosophie',
  'Calcul', 'Éveil scientifique', 'Lecture'
];
const SERVER_BASE_URL = 'https://school.providence.ma/files/';

const HomeworkPage: React.FC = () => {
  const { isTeacher, assignedClasses, isParent, user } = useAuth();
  const { homeworks, addHomework, updateHomework, deleteHomework, academicAssets, addAcademicAsset, removeAcademicAsset, students } = useData();
  const { t, isRTL } = useLanguage();

  // Wizard state variables
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);

  // Form state variables for the multi-step wizard
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [session, setSession] = useState('S1');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);
  const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);

  const visibleClasses = isTeacher ? assignedClasses : CLASSES;

  // Filter for Parents
  const childClassMatch = isParent 
    ? students.find(s => user?.childrenIds?.includes(s.id))?.class 
    : null;

  const filteredHomeworks = (isParent && childClassMatch)
    ? homeworks.filter(hw => hw.classes?.includes(childClassMatch) || hw.classes?.includes('Tous'))
    : homeworks;

  const filteredAssets = (isParent && childClassMatch)
    ? academicAssets.filter(asset => asset.classId === 'all' || asset.classId === childClassMatch)
    : academicAssets;

  const resetWizard = () => {
    setCurrentStep(1);
    setTitle('');
    setDescription('');
    setSelectedClasses([]);
    setSubject('');
    setSession('S1');
    setUploadedFile(null);
    setUploadedFilePreview(null);
    setEditingHomework(null);
  };

  const openWizard = () => {
    resetWizard();
    setIsWizardOpen(true);
  };

  const openEditWizard = (hw: Homework) => {
    setEditingHomework(hw);
    setTitle(hw.title);
    setDescription(hw.description);
    setSelectedClasses([...(hw.classes || [])]);
    setSubject(hw.subject || '');
    setSession(hw.session || 'S1');
    setUploadedFile(hw.fileName || null);
    setUploadedFilePreview(null); // reset preview for edit; can re-upload
    setCurrentStep(1);
    setIsWizardOpen(true);
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    resetWizard();
  };

  const handleNext = () => {
    if (currentStep < 4) {
      // Basic validation per step
      if (currentStep === 1 && (!title.trim() || !description.trim())) {
        toast.error(t('fill_all_fields'));
        return;
      }
      if (currentStep === 2 && selectedClasses.length === 0) {
        toast.error(t('select_classes'));
        return;
      }
      if (currentStep === 3 && (!subject || !session)) {
        toast.error(t('fill_all_fields'));
        return;
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClassToggle = (cls: string) => {
    setSelectedClasses(prev => 
      prev.includes(cls) 
        ? prev.filter(c => c !== cls) 
        : [...prev, cls]
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { compressImageFile, SUPPORTED_TYPES } = await import('../lib/imageCompressor');

      if (SUPPORTED_TYPES.includes(file.type) || file.type.startsWith('image/')) {
        const data = await compressImageFile(file);
        setUploadedFile(file.name);
        setUploadedFilePreview(data);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setUploadedFile(file.name);
          setUploadedFilePreview(ev.target?.result as string);
        };
        reader.onerror = () => {
          toast.error("حدث خطأ أثناء معالجة الصورة، يرجى المحاولة بصورة أخرى");
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('[ImagePicker] Error:', err);
      toast.error("حدث خطأ أثناء معالجة الصورة، يرجى المحاولة بصورة أخرى");
      setUploadedFile(null);
      setUploadedFilePreview(null);
    } finally {
      (e.target as HTMLInputElement).value = '';
    }
  };

  const handleResourceUpload = async (subjectKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { compressImageFile, SUPPORTED_TYPES } = await import('../lib/imageCompressor');
      if (SUPPORTED_TYPES.includes(file.type) || file.type.startsWith('image/')) {
        const payload = await compressImageFile(file);
        addAcademicAsset({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          payload,
          subjectKey,
          classId: 'all'
        });
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          addAcademicAsset({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            payload: ev.target?.result as string,
            subjectKey,
            classId: 'all'
          });
        };
        reader.onerror = () => {
          toast.error("حدث خطأ أثناء معالجة الصورة، يرجى المحاولة بصورة أخرى");
        };
        reader.readAsDataURL(file);
      }
      toast.success(`Média ajouté sous ${subjectKey}`);
    } catch (err) {
      console.error('[ImagePicker] Error:', err);
      toast.error("حدث خطأ أثناء معالجة الصورة، يرجى المحاولة بصورة أخرى");
    } finally {
      (e.target as HTMLInputElement).value = '';
    }
  };

  const handleSaveHomework = () => {
    if (!title.trim() || !description.trim() || selectedClasses.length === 0 || !subject) {
      toast.error(t('fill_all_fields'));
      return;
    }

    const homeworkData = {
      title: title.trim(),
      description: description.trim(),
      classes: [...selectedClasses],
      subject,
      session,
      fileName: uploadedFile || undefined,
      fileData: uploadedFilePreview || undefined, // store base64 if it successfully processed
      uploadDate: new Date().toISOString(),
    };

    if (editingHomework) {
      updateHomework({ ...homeworkData, id: editingHomework.id as string });
      toast.success('Devoir mis à jour !');
    } else {
      addHomework(homeworkData);
      toast.success(t('publish_homework') + ' !');
    }
    closeWizard();
  };

  // deleteHomework comes from DataContext (centralized persistence)

  const canEdit = true; // Placeholder - respects teacher role from auth in future integration

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : ''}`}>
      {/* Header matching project style */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('homework')}</h2>
        </div>
        {canEdit && (
          <Button 
            size="sm" 
            className="h-9 bg-primary text-[10px] font-black uppercase tracking-widest rounded-xl px-4" 
            onClick={openWizard}
          >
            <Plus className="w-3 h-3 mr-1" /> {editingHomework ? 'Modifier le devoir' : t('create_homework')}
          </Button>
        )}
      </div>

      <Tabs defaultValue="homeworks" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-12 rounded-2xl bg-slate-100 p-1 mb-6">
          <TabsTrigger value="homeworks" className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Devoirs Programmés</TabsTrigger>
          <TabsTrigger value="resources" className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Ressources & Supports</TabsTrigger>
        </TabsList>

        <TabsContent value="homeworks" className="space-y-4">
          {/* Existing Homework List - View Assignments */}
          {filteredHomeworks.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
              <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest">{t('no_homework')}</p>
            </div>
          ) : (
            filteredHomeworks.map((hw) => (
              <Card key={hw.id} className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white group hover:ring-2 hover:ring-primary/5 transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight">{hw.title}</h4>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-600">{hw.subject}</Badge>
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{hw.session}</Badge>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-blue-500 rounded-xl hover:bg-blue-50" 
                          onClick={() => openEditWizard(hw)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-rose-500 rounded-xl hover:bg-rose-50" 
                          onClick={() => deleteHomework(hw.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 mb-4 leading-relaxed">{hw.description}</p>

                  <div className="mb-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('assigned_to')}</div>
                    <div className="flex flex-wrap gap-1">
                      {hw.classes.map(cls => (
                        <Badge key={cls} variant="outline" className="text-xs font-bold py-0.5">{cls}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{t('created')}: {new Date(hw.uploadDate).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}</span>
                  </div>

                  {/* File preview using the fixed dynamic image/file layout from Schedules.tsx */}
                  {hw.fileName && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                      <div className="relative w-12 h-12 flex-shrink-0 cursor-pointer" onClick={() => { if (/\.(png|jpe?g|gif|webp|svg)$/i.test(hw.fileName!)) { setPreviewLightbox(hw.fileData || `${SERVER_BASE_URL}${hw.fileName}`); } }}>
                        {/\.(png|jpe?g|gif|webp|svg)$/i.test(hw.fileName) ? (
                          <img 
                            src={hw.fileData || `${SERVER_BASE_URL}${hw.fileName}`} 
                            alt={hw.fileName} 
                            className="w-12 h-12 object-cover rounded-md border border-slate-200" 
                            loading="lazy"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              if (hw.fileData) return; // Don't hide if we have base64
                              target.style.display = 'none';
                              const icon = target.parentElement?.querySelector('.fallback-icon') as HTMLElement;
                              if (icon) icon.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`fallback-icon ${/\.(png|jpe?g|gif|webp|svg)$/i.test(hw.fileName) ? 'hidden' : 'flex'} items-center justify-center w-12 h-12 text-primary bg-primary/5 rounded-md border border-primary/10`}>
                          <FileText className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-slate-700 block truncate">{hw.fileName}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 flex-shrink-0 print:hidden" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (hw.fileData && hw.fileData.startsWith('data:')) {
                            downloadFile(hw.fileData, hw.fileName || 'homework');
                          } else {
                            safeOpenExternalLink(hw.fileData || `${SERVER_BASE_URL}${hw.fileName}`);
                          }
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SUBJECTS.map((sub) => {
              const subjectAssets = filteredAssets?.filter(a => a.subjectKey === sub) || [];
              if (isParent && subjectAssets.length === 0) return null; // hide empty subjects for parents

              return (
                <Card key={sub} className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                      <h4 className="text-lg font-black text-slate-900 tracking-tight">{sub}</h4>
                      {isTeacher && (
                        <div 
                          className="relative group/uploader cursor-pointer" 
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            onChange={(e) => void handleResourceUpload(sub, e)}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                          />
                          <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full pointer-events-none group-hover/uploader:bg-primary group-hover/uploader:text-white transition-colors">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3 min-h-[100px]">
                      {subjectAssets.length === 0 ? (
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center py-4">Aucune ressource</p>
                      ) : (
                        subjectAssets.map(asset => (
                          <div key={asset.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 group/asset">
                            <div 
                              className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center cursor-pointer shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (asset.mimeType.startsWith('image/')) {
                                  setPreviewLightbox(asset.payload);
                                } else if (asset.payload && asset.payload.startsWith('data:')) {
                                  downloadFile(asset.payload, asset.fileName || 'asset');
                                } else {
                                  safeOpenExternalLink(asset.payload);
                                }
                              }}
                            >
                              {asset.mimeType.startsWith('image/') ? (
                                <img src={asset.payload} alt={asset.fileName} className="w-full h-full object-cover" />
                              ) : (
                                <FileText className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{asset.fileName}</p>
                              {asset.fileSize && <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{(asset.fileSize / 1024 / 1024).toFixed(2)} MB</p>}
                            </div>
                            {isTeacher && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-rose-500 rounded-lg hover:bg-rose-100 opacity-0 group-hover/asset:opacity-100 transition-opacity print:hidden" 
                                onClick={() => removeAcademicAsset(asset.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Multi-Step Wizard Dialog for Creating Homework */}
      <Dialog open={isWizardOpen} onOpenChange={(open) => { if (!open) closeWizard(); else setIsWizardOpen(true); }}>
        <DialogContent className="max-w-lg rounded-[2.5rem] p-8 border-none shadow-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6" /> {editingHomework ? 'Modifier le devoir' : t('create_homework')}
              <span className="text-xs font-normal text-slate-400 ml-auto">Step {currentStep} of 4</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-6 min-h-[320px]">
            {/* STEP 1: Content */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('homework_title')}</Label>
                  <Input 
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="e.g. Exercices de révision - Chapitre 3" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('homework_description')}</Label>
                  <Textarea 
                    className="min-h-[140px] rounded-2xl bg-slate-50 border-slate-200 p-4" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Provide detailed instructions for the students..." 
                    required 
                  />
                </div>
                <p className="text-xs text-slate-400">Step 1: Enter the homework content details.</p>
              </div>
            )}

            {/* STEP 2: Target Classes - Multi-select with checkboxes */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  {t('target_classes')}
                </Label>
                <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                  {visibleClasses.map(c => (
                    <label 
                      key={c} 
                      className={`flex items-center gap-2 p-2.5 bg-white rounded-xl cursor-pointer border transition-all text-sm font-black hover:bg-slate-50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary ${selectedClasses.includes(c) ? 'border-primary shadow-sm' : 'border-transparent'}`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedClasses.includes(c)}
                        onChange={() => handleClassToggle(c)}
                        className="w-4 h-4 accent-primary rounded"
                      />
                      <span className="text-sm font-black text-slate-800">{c}</span>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-slate-500 font-bold">
                  Selected ({selectedClasses.length}): {selectedClasses.length > 0 ? selectedClasses.join(', ') : 'None selected'}
                </div>
                <p className="text-xs text-slate-400">Step 2: Choose one or more classes for this assignment.</p>
              </div>
            )}

            {/* STEP 3: Subject & Session */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('subject')}</Label>
                  <select 
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  >
                    <option value="">-- Select Matière --</option>
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('sessions')}</Label>
                  <select 
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold"
                    value={session}
                    onChange={e => setSession(e.target.value)}
                  >
                    {SESSIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-400">Step 3: Specify the subject and session details.</p>
              </div>
            )}

            {/* STEP 4: Files - Upload selector with dynamic image/file preview layout (matching fixed Schedules.tsx) */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('attach_file')}</Label>
                <div 
                  className="border-4 border-dashed border-slate-100 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-slate-50/30 hover:bg-slate-50 hover:border-primary/20 transition-all cursor-pointer group relative" 
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.docx,.doc,.pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <Upload className="w-10 h-10 text-slate-200 mb-4 group-hover:scale-110 group-hover:text-primary transition-all" />
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest text-center">{t('select_file')}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Images will preview live</p>
                  
                  {uploadedFile && (
                    <div className="mt-4 flex flex-col items-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm relative group/file">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full scale-0 group-hover/file:scale-100 transition-all z-20 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setUploadedFile(null);
                          setUploadedFilePreview(null);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      {uploadedFilePreview && /\.(png|jpe?g|gif|webp|svg)$/i.test(uploadedFile) ? (
                        <img 
                          src={uploadedFilePreview} 
                          alt={uploadedFile} 
                          className="w-20 h-20 object-cover rounded-xl border border-primary/20 shadow-sm mb-2" 
                        />
                      ) : (
                        <Badge className="bg-primary/10 text-primary font-bold mb-2">{uploadedFile}</Badge>
                      )}
                      <span className="text-[10px] text-slate-500 font-bold">{uploadedFile}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400">Step 4: Upload supporting file if needed (preview uses local for images; server URL on publish like other uploads).</p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-6 gap-3 flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handlePrev} 
                  className="h-12 rounded-2xl font-black uppercase tracking-widest text-xs px-6"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={closeWizard} 
                className="h-12 rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                {t('cancel')}
              </Button>
              {currentStep < 4 ? (
                <Button 
                  onClick={handleNext} 
                  className="h-12 rounded-2xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 px-8"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSaveHomework} 
                  className="h-12 rounded-2xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 px-8"
                >
                  {t('publish_homework')} <Check className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Lightbox 
        isOpen={!!previewLightbox} 
        src={previewLightbox} 
        onClose={() => setPreviewLightbox(null)} 
        filename="homework_image"
      />
    </div>
  );
};

export default HomeworkPage;
