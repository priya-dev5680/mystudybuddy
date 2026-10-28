export const taskCategories = ['All Tasks', 'Today', 'Upcoming', 'Overdue', 'Completed'];

export function getTaskCategory(task, now = new Date()) {
  if (task.status === 'completed') return 'Completed';
  if (!task.due_at) return 'All Tasks';
  const due = new Date(task.due_at);
  if (Number.isNaN(due.getTime())) return 'All Tasks';
  if (due.getTime() < now.getTime()) return 'Overdue';
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (due >= todayStart && due < tomorrowStart) return 'Today';
  if (due >= tomorrowStart) return 'Upcoming';
  return 'All Tasks';
}

export function taskMatchesCategory(task, category, now = new Date()) {
  if (category === 'All Tasks') return true;
  if (category === 'Completed') return task.status === 'completed';
  if (!task.due_at) return false;
  const due = new Date(task.due_at);
  if (Number.isNaN(due.getTime())) return false;
  if (category === 'Today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return due >= start && due < end;
  }
  if (category === 'Upcoming') {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return task.status !== 'completed' && due >= tomorrow;
  }
  if (category === 'Overdue') return task.status !== 'completed' && due < now;
  return true;
}

export function getTaskCategoryCounts(tasks, now = new Date()) {
  const counts = Object.fromEntries(taskCategories.map(category => [category, 0]));
  for (const task of tasks) {
    const category = getTaskCategory(task, now);
    counts[category] += 1;
    if (category !== 'Today' && taskMatchesCategory(task, 'Today', now)) counts.Today += 1;
  }
  counts['All Tasks'] = tasks.length;
  return counts;
}

