import React, { useState } from 'react';

import { useStudentStore } from '../stores/studentStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Calendar, AlertCircle } from 'lucide-react';

export const AttendanceMonitoring: React.FC = () => {
  const { isRTL } = useLanguage();
  const attendance = useStudentStore(state => state.attendance);
  const students = useStudentStore(state => state.students);
  const events = useNotificationStore(state => state.events);
  
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterClass, setFilterClass] = useState<string>('');

  const filteredAttendance = attendance.filter(a => {
    if (filterDate && !a.date.startsWith(filterDate)) return false;
    if (filterClass && a.classId !== filterClass) return false;
    return true;
  });

  const getStudentName = (id: string) => {
    return students.find(s => s.id === id)?.fullName || 'Unknown Student';
  };

  const getAttendanceEvents = () => {
    return events.filter(e => e.type === 'attendance_marked').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {isRTL ? 'مراقبة الحضور والغياب' : 'Suivi des présences'}
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          {isRTL ? 'تتبع حضور التلاميذ وإشعارات الأولياء' : 'Suivre les présences et les notifications aux parents'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-none shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
              {isRTL ? 'سجل الحضور' : 'Registre des présences'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex gap-2 mb-4">
              <Input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="rounded-xl bg-slate-50 border-slate-200"
              />
              <Input
                type="text"
                placeholder={isRTL ? 'القسم (مثل 1A)' : 'Classe (ex: 1A)'}
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="rounded-xl bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-3">
              {filteredAttendance.length > 0 ? (
                filteredAttendance.map(record => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{getStudentName(record.studentId)}</p>
                      <p className="text-xs text-slate-500">{isRTL ? 'قسم: ' : 'Classe: '} {record.classId}</p>
                    </div>
                    <Badge className={record.present ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                      {record.present ? (isRTL ? 'حاضر' : 'Présent') : (isRTL ? 'غائب/متأخر' : 'Absent/Retard')}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400">
                  {isRTL ? 'لا يوجد سجلات مطابقة.' : 'Aucun registre trouvé.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-rose-500" />
              {isRTL ? 'سجل إشعارات الأولياء' : 'Historique des notifications'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3">
              {getAttendanceEvents().length > 0 ? (
                getAttendanceEvents().map(event => (
                  <div key={event.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-slate-800 text-sm">{event.title}</p>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(event.createdAt).toLocaleTimeString(isRTL ? 'ar-SA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{event.body}</p>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400">
                  {isRTL ? 'لا يوجد إشعارات.' : 'Aucune notification.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
