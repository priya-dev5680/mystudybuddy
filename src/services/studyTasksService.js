import { supabase } from '../lib/supabase.js';

const taskColumns = 'id,user_id,subject_id,title,description,due_at,priority,status,estimated_minutes,completed_at,created_at,updated_at';
const priorities = new Set(['low', 'medium', 'high']);
const statuses = new Set(['pending', 'in_progress', 'completed']);
const pageSize = 1000;

function validateTask(fields, partial = false) {
  const title = fields.title === undefined && partial ? undefined : String(fields.title ?? '').trim();
  if (!partial && !title) throw new Error('Add a task title before saving.');
  if (title !== undefined && title.length > 200) throw new Error('Task titles must be 200 characters or fewer.');
  if (fields.priority != null && !priorities.has(fields.priority)) throw new Error('Choose low, medium, or high priority.');
  if (fields.status != null && !statuses.has(fields.status)) throw new Error('Choose a valid task status.');
  if (fields.estimated_minutes != null && (!Number.isInteger(fields.estimated_minutes) || fields.estimated_minutes < 1 || fields.estimated_minutes > 1440)) {
    throw new Error('Estimated time must be a whole number from 1 to 1,440 minutes.');
  }
  return { ...fields, ...(title === undefined ? {} : { title }) };
}

export async function fetchStudyTasks(userId) {
  const tasks = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from('study_tasks')
      .select(taskColumns).eq('user_id', userId)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    tasks.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return tasks;
}

export async function createStudyTask(fields) {
  const values = validateTask(fields);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error('We could not verify your sign-in. Log in again and retry.');
  if (!authData?.user) throw new Error('Please log in again before saving a task.');
  const status = values.status || 'pending';
  const completedAt = status === 'completed' ? values.completed_at || new Date().toISOString() : null;

  const { data, error } = await supabase.from('study_tasks').insert({
    user_id: authData.user.id,
    subject_id: values.subject_id || null,
    title: values.title,
    description: String(values.description ?? '').trim(),
    due_at: values.due_at || null,
    priority: values.priority || 'medium',
    status,
    estimated_minutes: values.estimated_minutes ?? null,
    completed_at: completedAt,
  }).select(taskColumns).single();
  if (error) throw error;
  return data;
}

export async function updateStudyTask({ userId, id, changes }) {
  const allowed = ['subject_id', 'title', 'description', 'due_at', 'priority', 'status', 'estimated_minutes'];
  const values = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)));
  if (values.title !== undefined) values.title = String(values.title).trim();
  if (values.description !== undefined) values.description = String(values.description ?? '').trim();
  if (values.subject_id !== undefined) values.subject_id = values.subject_id || null;
  if (values.due_at !== undefined) values.due_at = values.due_at || null;
  if (values.estimated_minutes !== undefined && values.estimated_minutes !== null) values.estimated_minutes = Number(values.estimated_minutes);

  validateTask(values, true);
  if (values.status) {
    values.completed_at = values.status === 'completed' ? changes.completed_at || new Date().toISOString() : null;
  }
  if (!Object.keys(values).length) throw new Error('There are no task changes to save.');

  const { data, error } = await supabase.from('study_tasks').update(values)
    .eq('id', id).eq('user_id', userId).select(taskColumns).single();
  if (error) throw error;
  return data;
}

export async function deleteStudyTask({ userId, id }) {
  const { data, error } = await supabase.from('study_tasks').delete()
    .eq('id', id).eq('user_id', userId).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('This task is no longer available in your account. Refresh and try again.');
}
