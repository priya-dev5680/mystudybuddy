import { supabase } from '../lib/supabase.js';

const columns = 'id,user_id,subject_id,title,source_text,summary,created_at';

export async function generateSummary(notes) {
  let result;
  try {
    result = await supabase.functions.invoke('generate-summary', {
      body: { content: notes },
    });
  } catch (error) {
    if (/fetch|network|connection/i.test(error?.message || '')) throw new Error('Could not reach the summary service. Check your connection and try again.');
    throw error;
  }
  const { data, error } = result;
  if (error) {
    const response = error.context;
    const status = response?.status;
    let detail = '';
    try {
      const body = await response?.clone?.().json();
      detail = body?.error || body?.message || '';
    } catch {
      // The function can return a non-JSON response; use the status for a clear message.
    }

    if (status === 401 || status === 403) throw new Error('Your sign-in may have expired. Log in again, then retry.');
    if (status === 429) throw new Error('The summary service is busy. Wait a moment and try again.');
    if (status === 400) throw new Error(detail || 'The notes could not be processed. Check the text and try again.');
    if (status >= 500) throw new Error('The summary service is temporarily unavailable. Try again shortly.');
    if (!status && /fetch|network|connection/i.test(error.message || '')) throw new Error('Could not reach the summary service. Check your connection and try again.');
    throw new Error(detail || 'Could not generate a summary. Please try again.');
  }

  const summary = typeof data?.summary === 'string' ? data.summary.trim() : '';
  if (!summary) throw new Error('The summary service returned an empty result. Please try again.');
  return summary;
}

export async function fetchSavedSummaries(userId) {
  const { data, error } = await supabase
    .from('summaries')
    .select(columns)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveSummary({ userId, subjectId, title, sourceText, summary }) {
  const values = {
    user_id: userId,
    subject_id: subjectId || null,
    title: title.trim(),
    source_text: sourceText,
    summary: summary.trim(),
  };
  if (!values.title || !values.source_text.trim() || !values.summary) {
    throw new Error('Add a title, study notes, and a generated summary before saving.');
  }

  let duplicateQuery = supabase.from('summaries').select(columns).eq('user_id', userId)
    .eq('title', values.title);
  duplicateQuery = values.subject_id
    ? duplicateQuery.eq('subject_id', values.subject_id)
    : duplicateQuery.is('subject_id', null);
  const { data: candidates, error: lookupError } = await duplicateQuery.limit(100);
  if (lookupError) throw lookupError;
  const existing = candidates?.find(item => item.source_text === values.source_text && item.summary === values.summary);
  if (existing) return { summary: existing, duplicate: true };

  const { data, error } = await supabase.from('summaries').insert(values).select(columns).single();
  if (error) throw error;
  return { summary: data, duplicate: false };
}

export async function deleteSavedSummary({ userId, id }) {
  const { data, error } = await supabase.from('summaries').delete()
    .eq('id', id).eq('user_id', userId).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('This summary is no longer available in your account. Refresh and try again.');
}
