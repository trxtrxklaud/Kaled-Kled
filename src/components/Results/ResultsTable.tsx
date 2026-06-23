import React from 'react';
import { getSubjectName, SUBJECTS_KEYS } from './utils';

export interface ResultsTableProps {
  isRTL: boolean;
  classStudents: any[];
  localScores: Record<string, Record<string, string>>;
  handleScoreChange: (studentId: string, subject: string, value: string) => void;
  studentAverages: Record<string, number>;
  readOnly?: boolean;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  isRTL,
  classStudents,
  localScores,
  handleScoreChange,
  studentAverages,
  readOnly
}) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="w-full text-left min-w-[800px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="p-4 font-black text-slate-700 w-48 sticky left-0 bg-slate-50 shadow-[1px_0_0_0_#f1f5f9] z-10">{isRTL ? 'التلميذ' : 'Élève'}</th>
            {SUBJECTS_KEYS.map(sub => (
              <th key={sub} className="p-4 font-semibold text-xs text-slate-500 whitespace-nowrap text-center">
                {getSubjectName(sub, isRTL)}
              </th>
            ))}
            <th className="p-4 font-black text-primary text-center bg-primary/5">{isRTL ? 'المعدل' : 'Moyenne'}</th>
          </tr>
        </thead>
        <tbody>
          {classStudents.map(student => (
            <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
              <td className="p-2 sticky left-0 bg-white hover:bg-slate-50/50 shadow-[1px_0_0_0_#f1f5f9] z-10">
                <span className="font-bold text-sm text-slate-800 px-2 block truncate w-44">{student.fullName}</span>
              </td>
              {SUBJECTS_KEYS.map(sub => (
                <td key={sub} className="p-2 text-center text-sm font-semibold">
                  {readOnly ? (
                    <span className="text-slate-700">{localScores[student.id]?.[sub] || '-'}</span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.25"
                      dir="ltr"
                      className="w-16 h-10 mx-auto block text-center rounded-lg border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pb-0.5"
                      value={localScores[student.id]?.[sub] || ''}
                      onChange={(e) => handleScoreChange(student.id, sub, e.target.value)}
                    />
                  )}
                </td>
              ))}
              <td className="p-2 text-center bg-primary/5 font-black text-primary">
                {studentAverages[student.id] || '-'}
              </td>
            </tr>
          ))}
          {classStudents.length === 0 && (
            <tr>
              <td colSpan={SUBJECTS_KEYS.length + 2} className="p-8 text-center text-slate-400 font-semibold">
                {isRTL ? 'لا يوجد تلاميذ في هذا القسم' : 'Aucun élève dans cette classe'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(ResultsTable);
