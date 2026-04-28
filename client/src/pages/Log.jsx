import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLogs } from '../hooks/useLogs';
import { useCampers, useAllCabins } from '../hooks/useCampers';
import HourRow from '../components/HourRow';
import NavBar from '../components/NavBar';
import { HOURS, getOfflineQueue } from '../lib/helpers';

export default function Log() {
  const { profile, isNurse, user } = useAuth();
  const { cabins } = useAllCabins();

  const [selectedCabinId, setSelectedCabinId] = useState(null);
  const [weekNum, setWeekNum] = useState(1);
  const [dayNum, setDayNum] = useState(1);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);

  const currentHour = new Date().getHours();
  const currentHourRef = useRef(null);

  // Set cabin based on role
  useEffect(() => {
    if (!profile) return;
    if (profile.role === 'counselor' && profile.cabin_id) {
      setSelectedCabinId(profile.cabin_id);
    } else if (cabins.length > 0 && !selectedCabinId) {
      setSelectedCabinId(cabins[0].id);
    }
  }, [profile, cabins, selectedCabinId]);

  // Scroll to current hour on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentHourRef.current) {
        currentHourRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedCabinId]);

  // Track online/offline status
  useEffect(() => {
    function onOnline() {
      setIsOffline(false);
      setOfflineQueueSize(0);
    }
    function onOffline() {
      setIsOffline(true);
      setOfflineQueueSize(getOfflineQueue().length);
    }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const { logs, loading, saveLog, deleteLog } = useLogs(selectedCabinId, weekNum, dayNum);
  const { campers } = useCampers(selectedCabinId, weekNum);

  // Group log entries by hour
  const logsByHour = HOURS.reduce((acc, hour) => {
    acc[hour] = logs.filter(l => l.hour === hour);
    return acc;
  }, {});

  const selectedCabin = cabins.find(c => c.id === selectedCabinId);

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-lg mx-auto">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        {/* Offline banner */}
        {isOffline && (
          <div className="bg-amber-500 text-white text-center text-xs font-medium py-1.5 px-3">
            Offline — entries queued ({offlineQueueSize}) and will sync when reconnected
          </div>
        )}

        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <h1 className="text-lg font-bold text-blue-700">Merrick Monitor</h1>
            {loading && (
              <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="flex gap-2 items-center">
            {/* Cabin selector: nurses see dropdown, counselors see label */}
            {isNurse ? (
              <select
                value={selectedCabinId || ''}
                onChange={e => setSelectedCabinId(e.target.value)}
                className="flex-1 min-w-0 text-sm font-semibold border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
              >
                {cabins.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <span className="flex-1 text-sm font-semibold text-gray-700 px-1">
                {selectedCabin?.name || 'Your Cabin'}
              </span>
            )}

            <select
              value={weekNum}
              onChange={e => setWeekNum(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Week 1</option>
              <option value={2}>Week 2</option>
              <option value={3}>Week 3</option>
            </select>

            <select
              value={dayNum}
              onChange={e => setDayNum(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Chart: 24-hour scrollable rows */}
      <main className="flex-1 overflow-y-auto pb-20">
        {campers.length === 0 && !loading && (
          <div className="text-center py-12 px-6">
            <p className="text-gray-500 text-sm mb-2">No campers in this cabin for Week {weekNum}.</p>
            <p className="text-gray-400 text-xs">Add campers on the Campers tab.</p>
          </div>
        )}

        {HOURS.map(hour => (
          <div
            key={hour}
            ref={hour === currentHour ? currentHourRef : null}
          >
            <HourRow
              hour={hour}
              campers={campers}
              entries={logsByHour[hour]}
              onSave={saveLog}
              onDelete={deleteLog}
              weekNum={weekNum}
              dayNum={dayNum}
              cabinId={selectedCabinId}
              loggedBy={user?.id}
            />
          </div>
        ))}
      </main>

      <NavBar />
    </div>
  );
}
