import { SUBJECTS_KEYS, getSubjectName } from './utils';

export const handlePrintClassResults = (
  selectedClass: string,
  selectedTrimester: number,
  isRTL: boolean,
  classStudents: any[],
  localScores: Record<string, Record<string, string>>,
  studentAverages: Record<string, number>,
  stats: { max: number; min: number; avg: number }
) => {
  const html = `
    <html dir="${isRTL ? 'rtl' : 'ltr'}">
    <head>
      <title>Résultats - ${selectedClass}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
        th { background: #f8fafc; }
        .text-left { text-align: ${isRTL ? 'right' : 'left'}; }
        .header { text-align: center; margin-bottom: 20px; }
        .stats { display: flex; justify-content: space-around; margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${isRTL ? 'نتائج القسم' : 'Résultats de la classe'} ${selectedClass}</h2>
        <h3>${isRTL ? 'الثلاثي' : 'Trimester'} ${selectedTrimester === 4 ? (isRTL ? 'التجريبي' : 'Blanc') : selectedTrimester}</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-left">${isRTL ? 'التلميذ' : 'Élève'}</th>
            ${SUBJECTS_KEYS.map(k => `<th>${getSubjectName(k, isRTL)}</th>`).join('')}
            <th>${isRTL ? 'المعدل' : 'Moyenne'}</th>
          </tr>
        </thead>
        <tbody>
          ${classStudents.map(student => `
            <tr>
              <td class="text-left">${student.fullName}</td>
              ${SUBJECTS_KEYS.map(k => `<td>${localScores[student.id]?.[k] || '-'}</td>`).join('')}
              <td><strong>${studentAverages[student.id] || '-'}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="stats">
        <div>${isRTL ? 'أعلى معدل' : 'Plus haute moy'}: ${stats.max}</div>
        <div>${isRTL ? 'معدل القسم' : 'Moyenne de classe'}: ${stats.avg}</div>
        <div>${isRTL ? 'أدنى معدل' : 'Plus basse moy'}: ${stats.min}</div>
      </div>
    </body>
    </html>
  `;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }
};

export const handlePrintLevelResults = (
  selectedClass: string,
  selectedTrimester: number,
  isRTL: boolean,
  students: any[],
  academicResults: any[]
) => {
  const level = selectedClass.charAt(0);
  const levelStudents = students.filter(s => s.class.startsWith(level));

  // Compute averages for all students in this level
  const levelAvgs: Record<string, number> = {};
  levelStudents.forEach(student => {
    let sum = 0;
    let count = 0;
    SUBJECTS_KEYS.forEach(subject => {
      const result = academicResults.find(r => r.studentId === student.id && r.trimester === selectedTrimester && r.subject === subject);
      if (result && result.score !== undefined) {
        sum += result.score;
        count++;
      }
    });
    if (count > 0) {
      levelAvgs[student.id] = parseFloat((sum / count).toFixed(2));
    }
  });

  const levelClasses = Array.from(new Set(levelStudents.map(s => s.class))).sort();

  const html = `
    <html dir="${isRTL ? 'rtl' : 'ltr'}">
    <head>
      <title>Résultats Niveau - ${level}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
        th { background: #f8fafc; }
        .text-left { text-align: ${isRTL ? 'right' : 'left'}; }
        .header { text-align: center; margin-bottom: 20px; }
        h2 { margin:0; padding:10px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${isRTL ? 'نتائج المستوى' : 'Résultats du Niveau'} ${level}</h2>
        <h3>${isRTL ? 'الثلاثي' : 'Trimester'} ${selectedTrimester === 4 ? (isRTL ? 'التجريبي' : 'Blanc') : selectedTrimester}</h3>
      </div>
      ${levelClasses.map(cls => {
        const cStudents = levelStudents.filter(s => s.class === cls).sort((a,b) => String(a.fullName || '').localeCompare(String(b.fullName || '')));
        if (cStudents.length === 0) return '';
        return `
          <h4>${isRTL ? 'القسم' : 'Classe'}: ${cls}</h4>
          <table>
            <thead>
              <tr>
                <th class="text-left">${isRTL ? 'التلميذ' : 'Élève'}</th>
                ${SUBJECTS_KEYS.map(k => `<th>${getSubjectName(k, isRTL)}</th>`).join('')}
                <th>${isRTL ? 'المعدل' : 'Moyenne'}</th>
              </tr>
            </thead>
            <tbody>
              ${cStudents.map(student => `
                <tr>
                  <td class="text-left">${student.fullName}</td>
                  ${SUBJECTS_KEYS.map(k => {
                    const r = academicResults.find(x => x.studentId === student.id && x.trimester === selectedTrimester && x.subject === k);
                    return `<td>${r ? r.score : '-'}</td>`;
                  }).join('')}
                  <td><strong>${levelAvgs[student.id] || '-'}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }).join('')}
    </body>
    </html>
  `;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }
};
