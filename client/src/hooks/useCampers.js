import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useCampers(cabinId = null, weekNum = null) {
  const [campers, setCampers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCampers = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('campers')
      .select('*, cabins(id, name)')
      .eq('is_archived', false)
      .order('last_name', { ascending: true });

    if (cabinId) query = query.eq('cabin_id', cabinId);
    if (weekNum) query = query.eq('camp_week', weekNum);

    const { data, error } = await query;

    if (error) {
      setError(error.message);
    } else {
      setCampers(data ?? []);
    }
    setLoading(false);
  }, [cabinId, weekNum]);

  useEffect(() => {
    fetchCampers();
  }, [fetchCampers]);

  const saveCamper = useCallback(async (camperData) => {
    const isNew = !camperData.id;

    if (isNew) {
      const { data, error } = await supabase
        .from('campers')
        .insert(camperData)
        .select('*, cabins(id, name)')
        .single();
      if (error) throw error;
      setCampers(prev => [...prev, data].sort((a, b) => a.last_name.localeCompare(b.last_name)));
      return data;
    } else {
      const { id, ...rest } = camperData;
      const { data, error } = await supabase
        .from('campers')
        .update(rest)
        .eq('id', id)
        .select('*, cabins(id, name)')
        .single();
      if (error) throw error;
      setCampers(prev => prev.map(c => c.id === data.id ? data : c));
      return data;
    }
  }, []);

  const archiveCamper = useCallback(async (id) => {
    const { error } = await supabase
      .from('campers')
      .update({ is_archived: true })
      .eq('id', id);
    if (error) throw error;
    setCampers(prev => prev.filter(c => c.id !== id));
  }, []);

  return { campers, loading, error, saveCamper, archiveCamper, refetch: fetchCampers };
}

export function useAllCabins() {
  const [cabins, setCabins] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('cabins')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setCabins(data ?? []);
        setLoading(false);
      });
  }, []);

  return { cabins, loading };
}
