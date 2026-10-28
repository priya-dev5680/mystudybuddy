import { supabase } from '../lib/supabase.js';

const columns = 'id,subject_id,name,completed,created_at';

export async function fetchTopics(subjectIds) {
  if (!subjectIds.length) return [];
  const { data, error } = await supabase
    .from('topics')
    .select(columns)
    .in('subject_id', subjectIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTopic({ subjectId, name }) {
  const { data, error } = await supabase
    .from('topics')
    .insert({ subject_id: subjectId, name, completed: false })
    .select(columns)
    .single();
  if (error) throw error;
  return data;
}

export async function updateTopic({ subjectId, id, changes }) {
  const { data, error } = await supabase
    .from('topics')
    .update(changes)
    .eq('id', id)
    .eq('subject_id', subjectId)
    .select(columns)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTopic({ subjectId, id }) {
  const { data, error } = await supabase
    .from('topics')
    .delete()
    .eq('id', id)
    .eq('subject_id', subjectId)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('This topic is no longer available. Refresh and try again.');
}
