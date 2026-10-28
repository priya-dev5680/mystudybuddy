import { supabase } from '../lib/supabase.js';

const reminderColumns = 'id,user_id,task_id,title,message,remind_at,is_read,notified_at,created_at';
const pageSize = 1000;

function validateReminder({ title, message, remindAt }) {
  const cleanTitle = String(title ?? '').trim();
  const cleanMessage = String(message ?? '').trim();
  if (!cleanTitle) throw new Error('Add a reminder title before saving.');
  if (cleanTitle.length > 200) throw new Error('Reminder titles must be 200 characters or fewer.');
  if (cleanMessage.length > 2000) throw new Error('Reminder messages must be 2,000 characters or fewer.');
  const date = new Date(remindAt);
  if (!remindAt || Number.isNaN(date.getTime())) throw new Error('Choose a valid reminder date and time.');
  return { title: cleanTitle, message: cleanMessage, remind_at: date.toISOString() };
}

async function requireOwnedTask(userId, taskId) {
  if (!taskId) return;
  const { data, error } = await supabase.from('study_tasks').select('id')
    .eq('id', taskId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('The linked study task is no longer available. Refresh the planner and try again.');
}

async function findDuplicateTaskReminder(userId, taskId, remindAt, excludeId) {
  if (!taskId) return null;
  let query = supabase.from('reminders').select(reminderColumns)
    .eq('user_id', userId).eq('task_id', taskId).eq('remind_at', remindAt).limit(1);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchReminders(userId) {
  const reminders = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from('reminders').select(reminderColumns)
      .eq('user_id', userId)
      .order('remind_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    reminders.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return reminders;
}

export async function createReminder({ taskId, title, message, remindAt }) {
  const values = validateReminder({ title, message, remindAt });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error('We could not verify your sign-in. Log in again and retry.');
  const user = authData?.user;
  if (!user) throw new Error('Please log in again before saving a reminder.');
  await requireOwnedTask(user.id, taskId);

  const existing = await findDuplicateTaskReminder(user.id, taskId, values.remind_at);
  if (existing) return { reminder: existing, duplicate: true };

  const { data, error } = await supabase.from('reminders').insert({
    user_id: user.id,
    task_id: taskId || null,
    ...values,
    is_read: false,
  }).select(reminderColumns).single();
  if (error) throw error;
  return { reminder: data, duplicate: false };
}

export async function updateReminder({ userId, id, changes }) {
  const allowed = ['task_id', 'title', 'message', 'remind_at'];
  const values = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)));
  const taskId = values.task_id;
  if (values.task_id !== undefined) values.task_id = values.task_id || null;
  const validated = validateReminder({
    title: values.title,
    message: values.message,
    remindAt: values.remind_at,
  });
  Object.assign(values, validated);
  const { data: current, error: currentError } = await supabase.from('reminders')
    .select('remind_at').eq('id', id).eq('user_id', userId).maybeSingle();
  if (currentError) throw currentError;
  if (!current) throw new Error('This reminder is no longer available in your account. Refresh and try again.');
  if (new Date(current.remind_at).getTime() !== new Date(values.remind_at).getTime()) {
    values.is_read = false;
  }
  await requireOwnedTask(userId, taskId);
  const duplicate = await findDuplicateTaskReminder(userId, taskId, values.remind_at, id);
  if (duplicate) throw new Error('A reminder is already set for this task at that time. Choose a different time.');

  const { data, error } = await supabase.from('reminders').update(values)
    .eq('id', id).eq('user_id', userId).select(reminderColumns).single();
  if (error) throw error;
  return data;
}

export async function markReminderRead({ userId, id, now = new Date() }) {
  const { data, error } = await supabase.from('reminders').update({ is_read: true })
    .eq('id', id).eq('user_id', userId).lte('remind_at', now.toISOString())
    .select(reminderColumns).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This reminder is not due yet or is no longer available.');
  return data;
}

export async function markAllDueRemindersRead({ userId, now = new Date() }) {
  const { data, error } = await supabase.from('reminders').update({ is_read: true })
    .eq('user_id', userId).eq('is_read', false).lte('remind_at', now.toISOString())
    .select('id');
  if (error) throw error;
  return data ?? [];
}

export async function deleteReminder({ userId, id }) {
  const { data, error } = await supabase.from('reminders').delete()
    .eq('id', id).eq('user_id', userId).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('This reminder is no longer available in your account. Refresh and try again.');
}
