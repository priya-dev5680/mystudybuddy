import { supabase } from '../lib/supabase.js';

const columns = 'id,user_id,name,color,created_at';

export async function fetchSubjects(userId) {
  const { data, error } = await supabase
    .from('subjects')
    .select(columns)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createSubject({ userId, name, color }) {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ user_id: userId, name, color })
    .select(columns)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubject({ userId, id, name, color }) {
  const { data, error } = await supabase
    .from('subjects')
    .update({ name, color })
    .eq('id', id)
    .eq('user_id', userId)
    .select(columns)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubject({ userId, id }) {
  const { data, error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('This subject is no longer available in your account. Refresh and try again.');
}
