import { useState } from 'react';
import MealBanner from './MealBanner';
import LogEntryForm from './LogEntryForm';
import {
  formatHour,
  getMealInfo,
  getBgBadgeClass,
  EVENT_LABELS,
  EVENT_BADGE_COLORS,
} from '../lib/helpers';

function ConfirmCheckbox({ checked, disabled, onCheck }) {
  return (
    <button
      type="button"
      onClick={onCheck}
      disabled={disabled}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? 'bg-green-500 border-green-500 cursor-default'
          : disabled
            ? 'border-gray-300 bg-gray-200 cursor-not-allowed opacity-60'
            : 'border-gray-400 hover:border-blue-500 bg-white cursor-pointer'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth={2.5} className="w-3 h-3">
          <polyline points="2 6 5 9 10 3" />
        </svg>
      )}
    </button>
  );
}

function EntryChip({ entry, onEdit, onConfirmDose, isNurse }) {
  const camper = entry.campers;
  const camperMin = camper?.target_bg_min ?? 70;
  const camperMax = camper?.target_bg_max ?? 180;
  const hasInsulin = Number(entry.insulin_administered) > 0;
  const needsConfirmation = hasInsulin && !(entry.counselor_confirmed && entry.nurse_confirmed);

  return (
    <div className={`w-full mb-1.5 rounded-lg overflow-hidden border transition-all ${
      hasInsulin
        ? needsConfirmation
          ? 'border-red-200 hover:border-red-300'
          : 'border-green-200 hover:border-green-300'
        : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
    }`}>
      {/* Main row — tap to edit */}
      <button
        type="button"
        onClick={onEdit}
        className="w-full text-left flex items-center gap-2 px-3 py-2 bg-white"
      >
        <span className="text-sm font-medium text-gray-800 flex-1 truncate">
          {camper ? `${camper.first_name} ${camper.last_name}` : 'Unknown'}
        </span>

        {entry.event_type && entry.event_type !== 'none' && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${EVENT_BADGE_COLORS[entry.event_type]}`}>
            {EVENT_LABELS[entry.event_type]}
          </span>
        )}

        {entry.blood_glucose != null && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getBgBadgeClass(entry.blood_glucose, camperMin, camperMax)}`}>
            {entry.blood_glucose}
          </span>
        )}

        {entry.blood_glucose != null && !entry.followup_bg &&
          (entry.blood_glucose > camperMax || entry.blood_glucose < camperMin) && (
          <span className="text-xs text-amber-600 font-medium" title="No 15-min follow-up">
            ⚠
          </span>
        )}

        {needsConfirmation && (
          <span className="text-red-500 font-bold text-base leading-none" title="Insulin dose not fully confirmed">
            !
          </span>
        )}

        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-400 shrink-0">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* Dual sign-off panel — only when insulin was administered */}
      {hasInsulin && (
        <div className="border-t border-gray-100 px-3 py-2.5 bg-gray-50 space-y-2">
          <p className="text-xs text-gray-400 font-medium">
            {entry.insulin_administered}u insulin — dual sign-off required
          </p>

          {/* Counselor row */}
          <div className="flex items-center gap-2.5">
            <ConfirmCheckbox
              checked={!!entry.counselor_confirmed}
              disabled={!!entry.counselor_confirmed}
              onCheck={() => onConfirmDose?.(entry.id, 'counselor_confirmed')}
            />
            <span className={`text-xs ${entry.counselor_confirmed ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
              {entry.counselor_confirmed ? 'Counselor signed off' : 'Counselor: tap to sign off'}
            </span>
          </div>

          {/* Nurse row */}
          <div className="flex items-center gap-2.5">
            <ConfirmCheckbox
              checked={!!entry.nurse_confirmed}
              disabled={!!entry.nurse_confirmed || !isNurse}
              onCheck={() => isNurse && onConfirmDose?.(entry.id, 'nurse_confirmed')}
            />
            <span className={`text-xs font-medium ${entry.nurse_confirmed ? 'text-green-700' : 'text-amber-700'}`}>
              {entry.nurse_confirmed ? 'Nurse signed off' : 'Awaiting nurse sign-off'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HourRow({
  hour,
  campers,
  entries,
  onSave,
  onDelete,
  weekNum,
  dayNum,
  cabinId,
  loggedBy,
  onConfirmDose,
  isNurse,
}) {
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const mealInfo = getMealInfo(hour);
  const isCurrentHour = new Date().getHours() === hour;
  const existingCamperIds = entries.map(e => e.camper_id);
  const canAddMore = campers.length > entries.length;

  async function handleSave(payload) {
    return onSave(payload);
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this log entry?')) return;
    await onDelete(id);
    setEditingId(null);
  }

  return (
    <div
      id={`hour-${hour}`}
      className={`border-b border-gray-100 ${isCurrentHour ? 'scroll-mt-32' : ''}`}
    >
      {mealInfo && <MealBanner meal={mealInfo} />}

      <div className="px-3 py-2">
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`text-xs font-semibold w-16 shrink-0 ${
              isCurrentHour ? 'text-blue-700' : 'text-gray-400'
            }`}
          >
            {isCurrentHour && (
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1 align-middle animate-pulse" />
            )}
            {formatHour(hour)}
          </span>

          {entries.length === 0 && !showAddForm && (
            <span className="text-xs text-gray-300 italic">No entries</span>
          )}
        </div>

        {entries.map(entry => (
          editingId === entry.id ? (
            <LogEntryForm
              key={entry.id}
              hour={hour}
              weekNum={weekNum}
              dayNum={dayNum}
              cabinId={cabinId}
              loggedBy={loggedBy}
              campers={campers}
              existingEntry={entry}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
              onDelete={handleDelete}
            />
          ) : (
            <EntryChip
              key={entry.id}
              entry={entry}
              onEdit={() => {
                setEditingId(entry.id);
                setShowAddForm(false);
              }}
              onConfirmDose={onConfirmDose}
              isNurse={isNurse}
            />
          )
        ))}

        {showAddForm && (
          <LogEntryForm
            hour={hour}
            weekNum={weekNum}
            dayNum={dayNum}
            cabinId={cabinId}
            loggedBy={loggedBy}
            campers={campers}
            existingEntry={null}
            excludeCamperIds={existingCamperIds}
            onSave={async (payload) => {
              const saved = await handleSave(payload);
              setShowAddForm(false);
              return saved;
            }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {!showAddForm && !editingId && canAddMore && (
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
            }}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            <span>Add entry</span>
          </button>
        )}
      </div>
    </div>
  );
}
