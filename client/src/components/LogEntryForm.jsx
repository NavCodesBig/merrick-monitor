import { useState, useRef, useEffect } from 'react';
import {
  EVENT_TYPES,
  getBgBadgeClass,
  getBgRowClass,
  generateId,
} from '../lib/helpers';

const SAVE_DELAY_MS = 600;

const EMPTY_FORM = {
  id: null,
  camper_id: '',
  event_type: 'none',
  blood_glucose: '',
  insulin_administered: '',
  carbohydrates: '',
  followup_bg: '',
  notes: '',
};

export default function LogEntryForm({
  hour,
  weekNum,
  dayNum,
  cabinId,
  loggedBy,
  campers,
  existingEntry,
  onSave,
  onCancel,
  onDelete,
  excludeCamperIds = [],
}) {
  const [form, setForm] = useState(() =>
    existingEntry
      ? {
          id: existingEntry.id,
          camper_id: existingEntry.camper_id ?? '',
          event_type: existingEntry.event_type ?? 'none',
          blood_glucose: existingEntry.blood_glucose ?? '',
          insulin_administered: existingEntry.insulin_administered ?? '',
          carbohydrates: existingEntry.carbohydrates ?? '',
          followup_bg: existingEntry.followup_bg ?? '',
          notes: existingEntry.notes ?? '',
        }
      : { ...EMPTY_FORM }
  );

  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const timerRef = useRef(null);
  const isNew = !existingEntry;

  // Track which campers are available for new entries
  const availableCampers = isNew
    ? campers.filter(c => !excludeCamperIds.includes(c.id))
    : campers;

  const selectedCamper = campers.find(c => c.id === form.camper_id);
  const showInsulin = form.blood_glucose !== '' && form.blood_glucose !== null;
  const showCarbs = form.event_type === 'meal' || form.event_type === 'snack';
  const showFollowup = form.blood_glucose !== '' && form.blood_glucose !== null;

  function triggerSave(updatedForm) {
    if (!updatedForm.camper_id) return;

    clearTimeout(timerRef.current);
    setSaveStatus('saving');

    timerRef.current = setTimeout(async () => {
      try {
        const payload = {
          id: updatedForm.id || generateId(),
          camper_id: updatedForm.camper_id,
          cabin_id: cabinId,
          camp_week: weekNum,
          camp_day: dayNum,
          hour,
          event_type: updatedForm.event_type || 'none',
          blood_glucose: updatedForm.blood_glucose === '' ? null : Number(updatedForm.blood_glucose),
          insulin_administered:
            updatedForm.insulin_administered === '' ? null : Number(updatedForm.insulin_administered),
          carbohydrates:
            updatedForm.carbohydrates === '' ? null : Number(updatedForm.carbohydrates),
          followup_bg: updatedForm.followup_bg === '' ? null : Number(updatedForm.followup_bg),
          notes: updatedForm.notes || null,
          logged_by: loggedBy,
        };

        const saved = await onSave(payload);
        if (saved && saved.id) {
          setForm(prev => ({ ...prev, id: saved.id }));
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        console.error('Save failed:', err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, SAVE_DELAY_MS);
  }

  function handleChange(field, value) {
    const updated = { ...form, [field]: value };
    setForm(updated);
    triggerSave(updated);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const bgValue = Number(form.blood_glucose);
  const camperMin = selectedCamper?.target_bg_min ?? 70;
  const camperMax = selectedCamper?.target_bg_max ?? 180;
  const rowBgClass = form.blood_glucose !== ''
    ? getBgRowClass(bgValue, camperMin, camperMax)
    : 'bg-white border-l-4 border-transparent';

  return (
    <div className={`rounded-xl border border-gray-200 overflow-hidden mb-2 transition-colors ${rowBgClass}`}>
      {/* Camper selector row */}
      <div className="px-3 pt-3 pb-1">
        {isNew ? (
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">
              Camper
            </label>
            <select
              value={form.camper_id}
              onChange={e => handleChange('camper_id', e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select camper…</option>
              {availableCampers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Cancel"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-800">
              {selectedCamper ? `${selectedCamper.first_name} ${selectedCamper.last_name}` : 'Unknown camper'}
            </span>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1"
            >
              Done
            </button>
          </div>
        )}

        {/* Event type */}
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">
            Event
          </label>
          <select
            value={form.event_type}
            onChange={e => handleChange('event_type', e.target.value)}
            disabled={!form.camper_id}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            {EVENT_TYPES.map(et => (
              <option key={et.value} value={et.value}>{et.label}</option>
            ))}
          </select>
        </div>

        {/* Blood glucose */}
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">
            BG
          </label>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="number"
              inputMode="numeric"
              placeholder="—"
              value={form.blood_glucose}
              onChange={e => handleChange('blood_glucose', e.target.value)}
              disabled={!form.camper_id}
              className="w-24 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-xs text-gray-500">mg/dL</span>
            {form.blood_glucose !== '' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${getBgBadgeClass(bgValue, camperMin, camperMax)}`}>
                {bgValue > camperMax ? 'HIGH' : bgValue < camperMin ? 'LOW' : 'OK'}
              </span>
            )}
          </div>
        </div>

        {/* Insulin (visible when BG is entered) */}
        {showInsulin && (
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">
              Insulin
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                placeholder="—"
                value={form.insulin_administered}
                onChange={e => handleChange('insulin_administered', e.target.value)}
                className="w-24 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-xs text-gray-500">units</span>
            </div>
          </div>
        )}

        {/* Carbohydrates (visible for meal/snack) */}
        {showCarbs && (
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">
              Carbs
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={form.carbohydrates}
                onChange={e => handleChange('carbohydrates', e.target.value)}
                className="w-24 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-xs text-gray-500">g</span>
            </div>
          </div>
        )}

        {/* 15-min follow-up BG */}
        {showFollowup && (
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">
              F/U BG
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="15-min"
                value={form.followup_bg}
                onChange={e => handleChange('followup_bg', e.target.value)}
                className="w-24 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-xs text-gray-500">mg/dL</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="flex items-start gap-2 mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0 pt-2">
            Notes
          </label>
          <input
            type="text"
            placeholder="Optional notes…"
            value={form.notes}
            onChange={e => handleChange('notes', e.target.value)}
            disabled={!form.camper_id}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Footer: save status + delete */}
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="text-xs">
          {saveStatus === 'saving' && (
            <span className="text-blue-500 flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
              Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-green-600 flex items-center gap-1">
              <span>✓</span> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-600">Save failed — check connection</span>
          )}
          {saveStatus === 'idle' && !isNew && (
            <span className="text-gray-400 text-xs">Auto-save on</span>
          )}
        </div>

        {!isNew && onDelete && (
          <button
            onClick={() => onDelete(form.id)}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
          >
            Remove entry
          </button>
        )}
      </div>
    </div>
  );
}
