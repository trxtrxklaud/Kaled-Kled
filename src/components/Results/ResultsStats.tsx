import React from 'react';
import { ArrowUpCircle, Calculator, ArrowDownCircle } from 'lucide-react';

export interface ResultsStatsProps {
  isRTL: boolean;
  stats: {
    max: number;
    min: number;
    avg: number;
  };
}

const ResultsStats: React.FC<ResultsStatsProps> = ({ isRTL, stats }) => {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-emerald-600 font-semibold text-xs uppercase mb-1">{isRTL ? 'أعلى معدل' : 'Plus haute moyenne'}</p>
          <div className="text-2xl font-black text-emerald-700">{stats.max || '-'}</div>
        </div>
        <ArrowUpCircle className="w-8 h-8 text-emerald-200" />
      </div>
      
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-primary font-semibold text-xs uppercase mb-1">{isRTL ? 'معدل القسم' : 'Moyenne de la classe'}</p>
          <div className="text-2xl font-black text-primary">{stats.avg || '-'}</div>
        </div>
        <Calculator className="w-8 h-8 text-primary/20" />
      </div>
      
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-rose-600 font-semibold text-xs uppercase mb-1">{isRTL ? 'أدنى معدل' : 'Plus basse moyenne'}</p>
          <div className="text-2xl font-black text-rose-700">{stats.min || '-'}</div>
        </div>
        <ArrowDownCircle className="w-8 h-8 text-rose-200" />
      </div>
    </div>
  );
};

export default React.memo(ResultsStats);
