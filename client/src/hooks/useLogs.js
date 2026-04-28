import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { pushToOfflineQueue, flushOfflineQueue } from '../lib/helpers';

export function useLogs(cabinId, weekNum, dayNum) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    if (!cabinId || !weekNum || !dayNum) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('log_entries')
      .select(`
        *,
        campers(id, first_name, last_name, target_bg_min, target_bg_max)
      `)
      .eq('cabin_id', cabinId)
      .eq('camp_week', weekNum)
      .eq('camp_day', dayNum)
      .order('hour', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setLogs(data ?? []);
    }
    setLoading(false);
  }, [cabinId, weekNum, dayNum]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!cabinId || !weekNum || !dayNum) return;

    fetchLogs();

    // Unsubscribe previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`logs:${cabinId}:${weekNum}:${dayNum}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'log_entries',
          filter: `cabin_id=eq.${cabinId}`,
        },
        () => {
          // Refetch on any change to keep data fresh and consistent
          fetchLogs();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cabinId, weekNum, dayNum, fetchLogs]);

  // Flush offline queue when coming back online
  useEffect(() => {
    function handleOnline() {
      flushOfflineQueue(supabase).then(() => fetchLogs());
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchLogs]);

  const saveLog = useCallback(async (entryData) => {
    const payload = {
      ...entryData,
      updated_at: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      pushToOfflineQueue({
        type: 'upsert',
        table: 'log_entries',
        data: payload,
        options: { onConflict: 'camper_id,camp_week,camp_day,hour' },
      });
      // Optimistic update
      setLogs(prev => {
        const idx = prev.findIndex(
          l => l.camper_id === payload.camper_id &&
               l.camp_week === payload.camp_week &&
               l.camp_day === payload.camp_day &&
               l.hour === payload.hour
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [...prev, payload];
      });
      return { offline: true };
    }

    const { data, error } = await supabase
      .from('log_entries')
      .upsert(payload, { onConflict: 'camper_id,camp_week,camp_day,hour' })
      .select(`
        *,
        campers(id, first_name, last_name, target_bg_min, target_bg_max)
      `)
      .single();

    if (error) throw error;

    // Optimistic update (realtime will also fire but this is faster)
    setLogs(prev => {
      const idx = prev.findIndex(
        l => l.camper_id === data.camper_id &&
             l.camp_week === data.camp_week &&
             l.camp_day === data.camp_day &&
             l.hour === data.hour
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [...prev, data];
    });

    return data;
  }, []);

  const deleteLog = useCallback(async (id) => {
    if (!navigator.onLine) {
      pushToOfflineQueue({ type: 'delete', table: 'log_entries', id });
      setLogs(prev => prev.filter(l => l.id !== id));
      return;
    }

    const { error } = await supabase.from('log_entries').delete().eq('id', id);
    if (error) throw error;
    setLogs(prev => prev.filter(l => l.id !== id));
  }, []);

  return { logs, loading, error, saveLog, deleteLog, refetch: fetchLogs };
}
