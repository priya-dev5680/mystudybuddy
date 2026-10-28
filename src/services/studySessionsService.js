import { supabase } from '../lib/supabase.js';

const columns = 'id,user_id,subject_id,topic_id,duration_seconds,started_at,ended_at,created_at';
const pageSize = 1000;

export async function fetchStudySessions(userId) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('study_sessions')
      .select(columns)
      .eq('user_id', userId)
      .order('ended_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function findStudySession(id, userId) {
  const { data, error } = await supabase
    .from('study_sessions')
    .select(columns)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Idempotent by client-generated UUID so a refresh/retry cannot duplicate a completed timer. */
export async function saveStudySession(session) {
  if (!Number.isFinite(session.duration_seconds) || session.duration_seconds <= 0) {
    throw new Error('A study session must include at least one focused second.');
  }

  const existing = await findStudySession(session.id, session.user_id);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('study_sessions')
    .insert(session)
    .select(columns)
    .single();
  if (!error) return data;

  // The insert may have reached Supabase even if the browser lost its response.
  if (error.code === '23505') {
    const saved = await findStudySession(session.id, session.user_id);
    if (saved) return saved;
  }
  throw error;
}
