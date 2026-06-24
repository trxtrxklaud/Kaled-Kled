export const SUBJECTS_KEYS = [
  'arabe', 'francais', 'anglais', 'maths', 'scientifique', 
  'islamique', 'civique', 'histoire', 'geo', 'sport', 'art', 'musique'
];

export const getSubjectName = (key: string, isRTL: boolean) => {
  const map: Record<string, { fr: string, ar: string }> = {
    'arabe': { fr: 'Arabe', ar: 'اللغة العربية' },
    'francais': { fr: 'Français', ar: 'الفرنسية' },
    'anglais': { fr: 'Anglais', ar: 'الإنقليزية' },
    'maths': { fr: 'Mathématiques', ar: 'الرياضيات' },
    'scientifique': { fr: 'Éveil Scientifique', ar: 'الإيقاظ العلمي' },
    'islamique': { fr: 'Éd. Islamique', ar: 'التربية الإسلامية' },
    'civique': { fr: 'Éd. Civique', ar: 'التربية المدنية' },
    'histoire': { fr: 'Histoire', ar: 'التاريخ' },
    'geo': { fr: 'Géographie', ar: 'الجغرافيا' },
    'sport': { fr: 'Éd. Physique', ar: 'التربية البدنية' },
    'art': { fr: 'Éd. Plastique', ar: 'التربية التشكيلية' },
    'musique': { fr: 'Éd. Musicale', ar: 'التربية الموسيقية' }
  };
  return isRTL ? (map[key]?.ar || key) : (map[key]?.fr || key);
};

export const CLASSES = [
  '1A', '1B', '1C', '1D', '1E',
  '2A', '2B', '2C', '2D', '2E',
  '3A', '3B', '3C', '3D', '3E',
  '4A', '4B', '4C', '4D', '4E',
  '5A', '5B', '5C', '5D', '5E',
  '6A', '6B', '6C', '6D', '6E'
];
