import { useNavigate } from 'react-router-dom';

export default function CabinCard({ cabin, stats, onSelect }) {
  const navigate = useNavigate();
  const hasUnresolvedLow = stats.lowBgUnresolved > 0;

  function handleClick() {
    onSelect(cabin.id);
    navigate('/log');
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left rounded-2xl border-2 p-4 bg-white shadow-sm hover:shadow-md transition-all ${
        hasUnresolvedLow ? 'border-red-400' : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">{cabin.name}</h3>
          <p className="text-xs text-gray-500">{stats.camperCount} campers</p>
        </div>
        {hasUnresolvedLow && (
          <div className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
            <span>⚠</span>
            <span>Low BG!</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 rounded-xl bg-red-50 border border-red-200 p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.highBg}</div>
          <div className="text-xs text-red-500 mt-0.5">High BG</div>
        </div>
        <div className="flex-1 rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.lowBg}</div>
          <div className="text-xs text-blue-500 mt-0.5">Low BG</div>
        </div>
        <div className="flex-1 rounded-xl bg-green-50 border border-green-200 p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.normal}</div>
          <div className="text-xs text-green-500 mt-0.5">Normal</div>
        </div>
      </div>

      {hasUnresolvedLow && (
        <p className="mt-2 text-xs text-red-600 font-medium">
          {stats.lowBgUnresolved} low BG event{stats.lowBgUnresolved > 1 ? 's' : ''} missing follow-up
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-1 text-xs text-blue-600 font-medium">
        <span>Open log</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  );
}
