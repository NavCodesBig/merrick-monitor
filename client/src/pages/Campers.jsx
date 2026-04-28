import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCampers, useAllCabins } from '../hooks/useCampers';
import CamperForm from '../components/CamperForm';
import NavBar from '../components/NavBar';

function CamperCard({ camper, onEdit, canEdit }) {
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
        {canEdit && (
          <button
            onClick={() => onEdit(camper)}
            className="text-blue-600 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100"
          >
            Edit
          </button>
        )}
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
  const { isNurse, profile } = useAuth();
  const { cabins } = useAllCabins();

  const [filterCabinId, setFilterCabinId] = useState(
    !isNurse && profile?.cabin_id ? profile.cabin_id : ''
  );
  const [filterWeek, setFilterWeek] = useState('');
  const [modalCamper, setModalCamper] = useState(undefined); // undefined=closed, null=new, object=editing
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
            {isNurse && (
              <select
                value={filterCabinId}
                onChange={e => setFilterCabinId(e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Cabins</option>
                {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
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
            onEdit={setModalCamper}
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

      <NavBar />
    </div>
  );
}
