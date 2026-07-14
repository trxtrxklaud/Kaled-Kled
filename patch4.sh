sed -i '/<Check className="w-5 h-5 mr-2" \/> {isRTL ? '"'"'إضافة الواجب'"'"' : '"'"'Ajouter le devoir'"'"'}/a\
              </Button>\
\
              <div className="mt-8">\
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">{isRTL ? '"'"'الواجبات المسجلة'"'"' : '"'"'Devoirs enregistrés'"'"'}</h4>\
                <div className="space-y-3">\
                  {homeworks.filter(hw => hw.classes?.includes(selectedClass!)).length === 0 ? (\
                    <p className="text-center text-xs text-slate-400 py-4">{isRTL ? '"'"'لا يوجد واجبات'"'"' : '"'"'Aucun devoir'"'"'}</p>\
                  ) : (\
                    homeworks.filter(hw => hw.classes?.includes(selectedClass!)).map(hw => (\
                      <div key={hw.id} className="flex flex-col p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">\
                        <div className="flex justify-between items-start mb-2">\
                          <div>\
                            <h5 className="font-bold text-sm text-slate-900">{hw.title}</h5>\
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{hw.subject}</span>\
                          </div>\
                          {hw.fileName && (\
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-1.5 rounded-lg">\
                              <FileText className="w-3 h-3" />\
                              <span className="max-w-[100px] truncate">{hw.fileName}</span>\
                            </div>\
                          )}\
                        </div>\
                        {hw.description && <p className="text-xs text-slate-500 line-clamp-2">{hw.description}</p>}\
                      </div>\
                    ))\
                  )}\
                </div>\
              </div>' src/pages/TeacherPortal.tsx
