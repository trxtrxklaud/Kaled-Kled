sed -i '/<\/textarea>/a\
                </div>\
                <div className="space-y-1.5">\
                  <Label className="text-xs font-bold text-slate-500 ml-1">{isRTL ? '"'"'صورة / ملف'"'"' : '"'"'Image / Fichier'"'"'}</Label>\
                  <div className="relative">\
                    <input \
                      type="file" \
                      onChange={handleHwFileSelect}\
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"\
                    />\
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">\
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">\
                        {hwFilePreview ? (\
                           <img src={hwFilePreview} className="w-10 h-10 rounded-xl object-cover" />\
                        ) : (\
                           <Upload className="w-4 h-4" />\
                        )}\
                      </div>\
                      <div className="flex-1 min-w-0">\
                        <p className="text-xs font-bold text-slate-700 truncate">{hwFile || (isRTL ? '"'"'اختر ملفاً'"'"' : '"'"'Choisir un fichier'"'"')}</p>\
                      </div>\
                    </div>\
                  </div>' src/pages/TeacherPortal.tsx
