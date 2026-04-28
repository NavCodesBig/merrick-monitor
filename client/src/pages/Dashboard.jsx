import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAllCabins } from '../hooks/useCampers';
import { supabase } from '../lib/supabaseClient';
import CabinCard from '../components/CabinCard';
import NavBar from '../components/NavBar';

export default function Dashboard() {
  const { isNurse } = useAuth();
  const { cabins, loading: cabinsLoading } = useAllCabins();
  const [weekNum, setWeekNum] = useState(1);
  const [dayNum, setDayNum] = useState(1);
  const [stats, setStats] = useState({});
  const [camperCounts, setCamperCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCabinId, setSelectedCabinId] = useState(null);

  useEffect(() => {
    if (!cabins.length) return;
    fetchStats();
    fetchCamperCounts();
  }, [cabins, weekNum, dayNum]);

  async function fetchStats() {
    setLoading(true);

    const { data: logs } = await supabase
      .from('log_entries')
      .select('cabin_id, blood_glucose, followup_bg, campers(target_bg_min, target_bg_max)')
      .eq('camp_week', weekNum)
      .eq('camp_day', dayNum);

    if (!logs) { setLoading(false); return; }

    const newStats = {};
    for (const cabin of cabins) {
      const cabinLogs = logs.filter(l => l.cabin_id === cabin.id);
      let highBg = 0, lowBg = 0, normal = 0, lowBgUnresolved = 0;

      for (const log of cabinLogs) {
        const bg = log.blood_glucose;
        if (!bg) continue;
        const min = log.campers?.target_bg_min ?? 70;
        const max = log.campers?.target_bg_max ?? 180;
        if (bg > max) {
          highBg++;
        } else if (bg < min) {
          lowBg++;
          if (!log.followup_bg) lowBgUnresolved++;
        } else {
          normal++;
        }
      }

      newStats[cabin.id] = { highBg, lowBg, normal, lowBgUnresolved };
    }

    setStats(newStats);
    setLoading(false);
  }

  async function fetchCamperCounts() {
    const { data } = await supabase
      .from('campers')
      .select('cabin_id')
      .eq('is_archived', false)
      .eq('camp_week', weekNum);

    if (!data) return;

    const counts = {};
    for (const r of data) {
      counts[r.cabin_id] = (counts[r.cabin_id] ?? 0) + 1;
    }
    setCamperCounts(counts);
  }

  if (!isNurse) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Dashboard is nurse-only.</p>
        </div>
        <NavBar />
      </div>
    );
  }

  const totalHighBg = Object.values(stats).reduce((s, c) => s + (c.highBg ?? 0), 0);
  const totalLowBg = Object.values(stats).reduce((s, c) => s + (c.lowBg ?? 0), 0);
  const unresolvedLows = Object.values(stats).reduce((s, c) => s + (c.lowBgUnresolved ?? 0), 0);

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          {loading && (
            <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={weekNum}
            onChange={e => setWeekNum(Number(e.target.value))}
            className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Week 1</option>
            <option value={2}>Week 2</option>
            <option value={3}>Week 3</option>
          </select>
          <select
            value={dayNum}
            onChange={e => setDayNum(Number(e.target.value))}
            className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7].map(d => (
              <option key={d} value={d}>Day {d}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 px-4 py-4 space-y-4">
        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{totalHighBg}</div>
            <div className="text-xs text-red-500 mt-0.5">High BG Today</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalLowBg}</div>
            <div className="text-xs text-blue-500 mt-0.5">Low BG Today</div>
          </div>
          <div className={`border rounded-2xl p-3 text-center ${unresolvedLows > 0 ? 'bg-red-100 border-red-400' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`text-2xl font-bold ${unresolvedLows > 0 ? 'text-red-700' : 'text-gray-500'}`}>
              {unresolvedLows}
            </div>
            <div className={`text-xs mt-0.5 ${unresolvedLows > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              No F/U
            </div>
          </div>
        </div>

        {unresolvedLows > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-800">
                {unresolvedLows} low BG event{unresolvedLows > 1 ? 's' : ''} need follow-up
              </p>
              <p className="text-xs text-red-600">Check the affected cabin logs immediately.</p>
            </div>
          </div>
        )}

        {/* Cabin cards */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-1">Cabins</h2>

        {cabinsLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          cabins.map(cabin => (
            <CabinCard
              key={cabin.id}
              cabin={cabin}
              stats={{
                ...(stats[cabin.id] ?? { highBg: 0, lowBg: 0, normal: 0, lowBgUnresolved: 0 }),
                camperCount: camperCounts[cabin.id] ?? 0,
              }}
              onSelect={setSelectedCabinId}
            />
          ))
        )}
      </main>

      <NavBar />
    </div>
  );
}
