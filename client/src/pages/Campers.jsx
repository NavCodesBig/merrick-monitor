import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCampers, useAllCabins } from '../hooks/useCampers';
import CamperForm from '../components/CamperForm';
import NavBar from '../components/NavBar';

const API_URL = import.meta.env.VITE_API_URL ?? '';

function InsightsModal({ camper, session, onClose }) {
  const [week, setWeek] = useState(camper.camp_week ?? 1);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchInsights() {
    setLoading(true);
    setError(null);
    setInsights(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ camper_id: camper.id, week }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Analysis failed');
      setInsights(json.insights);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mt-auto bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">AI Insights</h2>
            <p className="text-xs text-gray-500">{camper.first_name} {camper.last_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">✕</button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="flex gap-3">
            <select
              value={week}
              onChange={e => setWeek(Number(e.target.value))}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white"
            >
              <option value={1}>Week 1</option>
              <option value={2}>Week 2</option>
              <option value={3}>Week 3</option>
            </select>
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="flex-1 py-2.5 bg-purple-700 text-white text-sm font-semibold rounded-xl hover:bg-purple-800 disabled:opacity-60"
            >
              {loading ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Gemini is analyzing trends…</p>
            </div>
          )}

          {insights && !loading && (
            <div className="space-y-3">
              <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-4">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-3">AI Analysis</p>
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {insights}
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center px-2">
                AI suggestions are informational only. Always apply clinical judgment.
              </p>
            </div>
          )}

          {!insights && !loading && !error && (
            <p className="text-center text-gray-400 text-sm py-6">
              Select a week and tap Analyze to get AI-powered trend insights.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CamperCard({ camper, onEdit, onInsights, canEdit, isNurse }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            {camper.first_name} {camper.last_name}
          </h3>
          <p className="text-sm text-gray-500">
            {camper.cabins?.name} · Week {camper.camp_week} · {camper.diabetes_type}
          </p>
        </div>
        <div className="flex gap-2">
          {isNurse && (
            <button
              onClick={() => onInsights(camper)}
              className="text-purple-600 text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100"
            >
              AI
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => onEdit(camper)}
              className="text-blue-600 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {camper.insulin_type && (
          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
            {camper.insulin_type}
          </span>
        )}
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          Target: {camper.target_bg_min}–{camper.target_bg_max} mg/dL
        </span>
      </div>

      {camper.notes && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          📋 {camper.notes}
        </p>
      )}

      {camper.emergency_contact_name && (
        <p className="mt-2 text-xs text-gray-500">
          Emergency: {camper.emergency_contact_name}
          {camper.emergency_contact_phone && ` · ${camper.emergency_contact_phone}`}
        </p>
      )}
    </div>
  );
}

export default function Campers() {
  const { isNurse, profile, session } = useAuth();
  const { cabins } = useAllCabins();

  const [filterCabinId, setFilterCabinId] = useState('');
  const filterInitRef = useRef(false);

  // Default counselors to their own cabin on first load
  useEffect(() => {
    if (!profile || filterInitRef.current) return;
    filterInitRef.current = true;
    if (!isNurse && profile.cabin_id) {
      setFilterCabinId(profile.cabin_id);
    }
  }, [profile, isNurse]);

  const [filterWeek, setFilterWeek] = useState('');
  const [modalCamper, setModalCamper] = useState(undefined); // undefined=closed, null=new, object=editing
  const [insightsCamper, setInsightsCamper] = useState(null);
  const [search, setSearch] = useState('');

  const { campers, loading, saveCamper, archiveCamper } = useCampers(
    filterCabinId || null,
    filterWeek ? Number(filterWeek) : null
  );

  const filtered = campers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q)
    );
  });

  async function handleSave(data) {
    await saveCamper(data);
    setModalCamper(undefined);
  }

  async function handleArchive(camper) {
    if (!window.confirm(`Archive ${camper.first_name} ${camper.last_name}? This hides them from all views.`)) return;
    await archiveCamper(camper.id);
    setModalCamper(undefined);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Campers</h1>
            {isNurse && (
              <button
                onClick={() => setModalCamper(null)}
                className="bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-800"
              >
                + Add
              </button>
            )}
          </div>

          {/* Search */}
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-blue-500"
          />

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterCabinId}
              onChange={e => setFilterCabinId(e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Cabins</option>
              {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={filterWeek}
              onChange={e => setFilterWeek(e.target.value)}
              className="text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Weeks</option>
              <option value="1">Week 1</option>
              <option value="2">Week 2</option>
              <option value="3">Week 3</option>
            </select>
          </div>
        </div>
      </header>

      {/* Camper list */}
      <main className="flex-1 overflow-y-auto pb-20 px-4 py-3 space-y-3">
        {loading && (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">
              {search ? 'No campers match your search.' : 'No campers yet.'}
            </p>
            {isNurse && !search && (
              <button
                onClick={() => setModalCamper(null)}
                className="mt-4 text-blue-600 text-sm font-medium"
              >
                + Add first camper
              </button>
            )}
          </div>
        )}

        {filtered.map(camper => (
          <CamperCard
            key={camper.id}
            camper={camper}
            canEdit={isNurse || camper.cabin_id === profile?.cabin_id}
            isNurse={isNurse}
            onEdit={setModalCamper}
            onInsights={setInsightsCamper}
          />
        ))}
      </main>

      {/* Modal: Add / Edit camper */}
      {modalCamper !== undefined && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalCamper(undefined)} />
          <div className="relative mt-auto bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">
                {modalCamper ? 'Edit Camper' : 'Add Camper'}
              </h2>
              <button onClick={() => setModalCamper(undefined)} className="text-gray-400 hover:text-gray-600 p-2">
                ✕
              </button>
            </div>
            <div className="px-4 py-4">
              <CamperForm
                camper={modalCamper}
                cabins={cabins}
                onSave={handleSave}
                onCancel={() => setModalCamper(undefined)}
              />
              {modalCamper && isNurse && (
                <button
                  onClick={() => handleArchive(modalCamper)}
                  className="w-full mt-3 py-3 text-red-600 text-sm font-semibold border border-red-200 rounded-xl hover:bg-red-50"
                >
                  Archive camper
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {insightsCamper && (
        <InsightsModal
          camper={insightsCamper}
          session={session}
          onClose={() => setInsightsCamper(null)}
        />
      )}

      <NavBar />
    </div>
  );
}
