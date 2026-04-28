import { useState } from 'react';

const DIABETES_TYPES = ['Type 1', 'Type 2'];
const WEEKS = [1, 2, 3];

const BLANK = {
  first_name: '',
  last_name: '',
  cabin_id: '',
  diabetes_type: 'Type 1',
  insulin_type: '',
  target_bg_min: 70,
  target_bg_max: 180,
  emergency_contact_name: '',
  emergency_contact_phone: '',
  notes: '',
  camp_week: 1,
};

export default function CamperForm({ camper, cabins, onSave, onCancel }) {
  const [form, setForm] = useState(
    camper
      ? {
          first_name: camper.first_name,
          last_name: camper.last_name,
          cabin_id: camper.cabin_id,
          diabetes_type: camper.diabetes_type,
          insulin_type: camper.insulin_type ?? '',
          target_bg_min: camper.target_bg_min,
          target_bg_max: camper.target_bg_max,
          emergency_contact_name: camper.emergency_contact_name ?? '',
          emergency_contact_phone: camper.emergency_contact_phone ?? '',
          notes: camper.notes ?? '',
          camp_week: camper.camp_week ?? 1,
        }
      : { ...BLANK }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.cabin_id) {
      setError('First name, last name, and cabin are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(camper ? { id: camper.id, ...form } : form);
    } catch (err) {
      setError(err.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">First name *</label>
          <input
            type="text"
            value={form.first_name}
            onChange={e => set('first_name', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Last name *</label>
          <input
            type="text"
            value={form.last_name}
            onChange={e => set('last_name', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      {/* Cabin + Week */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Cabin *</label>
          <select
            value={form.cabin_id}
            onChange={e => set('cabin_id', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select…</option>
            {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Camp Week *</label>
          <select
            value={form.camp_week}
            onChange={e => set('camp_week', Number(e.target.value))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {WEEKS.map(w => <option key={w} value={w}>Week {w}</option>)}
          </select>
        </div>
      </div>

      {/* Diabetes type + Insulin type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Diabetes type</label>
          <select
            value={form.diabetes_type}
            onChange={e => set('diabetes_type', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {DIABETES_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Insulin type</label>
          <input
            type="text"
            placeholder="e.g. Humalog"
            value={form.insulin_type}
            onChange={e => set('insulin_type', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Target BG range */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Target BG range (mg/dL)</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            value={form.target_bg_min}
            onChange={e => set('target_bg_min', Number(e.target.value))}
            className="w-24 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            inputMode="numeric"
            value={form.target_bg_max}
            onChange={e => set('target_bg_max', Number(e.target.value))}
            className="w-24 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Emergency contact */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Emergency contact</label>
          <input
            type="text"
            placeholder="Name"
            value={form.emergency_contact_name}
            onChange={e => set('emergency_contact_name', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
          <input
            type="tel"
            placeholder="(555) 000-0000"
            value={form.emergency_contact_phone}
            onChange={e => set('emergency_contact_phone', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Notes / Special instructions</label>
        <textarea
          rows={3}
          placeholder="Allergies, special instructions, etc."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : camper ? 'Update Camper' : 'Add Camper'}
        </button>
      </div>
    </form>
  );
}
