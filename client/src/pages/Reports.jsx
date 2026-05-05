import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAllCabins, useCampers } from '../hooks/useCampers';
import NavBar from '../components/NavBar';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export default function Reports() {
  const { isNurse, session } = useAuth();
  const { cabins } = useAllCabins();

  const [cabinId, setCabinId]     = useState('');
  const [weekNum, setWeekNum]     = useState(1);
  const [camperId, setCamperId]   = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError]         = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  const [sheetCabinId, setSheetCabinId]     = useState('');
  const [sheetWeek, setSheetWeek]           = useState(1);
  const [sheetDay, setSheetDay]             = useState(1);
  const [sheetGenerating, setSheetGenerating] = useState(false);
  const [sheetError, setSheetError]         = useState(null);
  const [sheetLastGenerated, setSheetLastGenerated] = useState(null);

  const { campers } = useCampers(cabinId || null, weekNum);

  // Reset camper selection when cabin or week changes
  useEffect(() => { setCamperId(''); }, [cabinId, weekNum]);

  async function handleGenerate() {
    if (!cabinId)  { setError('Please select a cabin.');   return; }
    if (!camperId) { setError('Please select a camper.');  return; }

    setGenerating(true);
    setError(null);

    try {
      const token = session?.access_token;
      const res = await fetch(
        `${API_URL}/api/reports/weekly?cabin_id=${cabinId}&week=${weekNum}&camper_id=${camperId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Server error: ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);

      const camper = campers.find(c => c.id === camperId);
      const cabin  = cabins.find(c => c.id === cabinId);
      const safeName = `${camper?.first_name ?? 'camper'}-${camper?.last_name ?? ''}`.toLowerCase().replace(/\s+/g, '-');
      const filename = `merrick-${safeName}-week${weekNum}.pdf`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setLastGenerated(filename);
    } catch (err) {
      setError(err.message ?? 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePrintSheet() {
    if (!sheetCabinId) { setSheetError('Please select a cabin.'); return; }

    setSheetGenerating(true);
    setSheetError(null);

    try {
      const token = session?.access_token;
      const res = await fetch(
        `${API_URL}/api/reports/daily-sheet?cabin_id=${sheetCabinId}&week=${sheetWeek}&day=${sheetDay}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Server error: ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const cabin = cabins.find(c => c.id === sheetCabinId);
      const filename = `merrick-${(cabin?.name ?? 'cabin').toLowerCase().replace(/\s+/g, '-')}-week${sheetWeek}-day${sheetDay}-sheet.pdf`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSheetLastGenerated(filename);
    } catch (err) {
      setSheetError(err.message ?? 'Failed to generate sheet.');
    } finally {
      setSheetGenerating(false);
    }
  }

  if (!isNurse) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Reports are nurse-only.</p>
        </div>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">Reports</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 px-4 py-6 space-y-5">
        {/* Daily Log Sheet */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Daily Log Sheet</h2>
            <p className="text-sm text-gray-500">
              Blank paper backup — pre-filled with each camper's name, target BG, and insulin type. Print before each shift in case wifi goes down.
            </p>
          </div>

          {sheetError && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-700">
              {sheetError}
            </div>
          )}

          {sheetLastGenerated && (
            <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <span>✓</span>
              <span>Downloaded: <span className="font-medium">{sheetLastGenerated}</span></span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cabin</label>
            <select
              value={sheetCabinId}
              onChange={e => setSheetCabinId(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select cabin…</option>
              {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Week</label>
              <select
                value={sheetWeek}
                onChange={e => setSheetWeek(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Week 1</option>
                <option value={2}>Week 2</option>
                <option value={3}>Week 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Day</label>
              <select
                value={sheetDay}
                onChange={e => setSheetDay(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                {[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>Day {d}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handlePrintSheet}
            disabled={sheetGenerating || !sheetCabinId}
            className="w-full py-4 bg-gray-800 text-white font-semibold rounded-2xl hover:bg-gray-900 disabled:opacity-60 transition-colors text-base"
          >
            {sheetGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </span>
            ) : (
              'Print Daily Sheet'
            )}
          </button>
        </div>

        {/* Weekly camper PDF */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Camper PDF Report</h2>
            <p className="text-sm text-gray-500">
              Download an individualized weekly report for a single camper — all BG readings, insulin doses, and carb logs across all 7 days.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {lastGenerated && (
            <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <span>✓</span>
              <span>Downloaded: <span className="font-medium">{lastGenerated}</span></span>
            </div>
          )}

          {/* Cabin */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Cabin
            </label>
            <select
              value={cabinId}
              onChange={e => setCabinId(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select cabin…</option>
              {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Week */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Camp Week
            </label>
            <select
              value={weekNum}
              onChange={e => setWeekNum(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Week 1</option>
              <option value={2}>Week 2</option>
              <option value={3}>Week 3</option>
            </select>
          </div>

          {/* Camper */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Camper
            </label>
            <select
              value={camperId}
              onChange={e => setCamperId(e.target.value)}
              disabled={!cabinId}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">
                {cabinId ? (campers.length === 0 ? 'No campers in this cabin/week' : 'Select camper…') : 'Select a cabin first…'}
              </option>
              {campers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !cabinId || !camperId}
            className="w-full py-4 bg-blue-700 text-white font-semibold rounded-2xl hover:bg-blue-800 disabled:opacity-60 transition-colors text-base"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating PDF…
              </span>
            ) : (
              '⬇ Download Camper Report'
            )}
          </button>
        </div>
      </main>

      <NavBar />
    </div>
  );
}
