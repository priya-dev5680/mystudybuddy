function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateAtOffset(date, offset) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

function formatDay(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
}

export function formatStudyDuration(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const totalMinutes = Math.floor(safeSeconds / 60);
  if (safeSeconds > 0 && totalMinutes === 0) return `${Math.floor(safeSeconds)}s`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

/** All day boundaries are local calendar days, including across DST transitions. */
export function calculateStudyAnalytics(sessions, subjects, now = new Date()) {
  const completed = sessions
    .filter(session => Number(session.duration_seconds) > 0 && session.ended_at && Number.isFinite(new Date(session.ended_at).getTime()))
    .map(session => ({ ...session, duration_seconds: Number(session.duration_seconds) }))
    .sort((a, b) => new Date(b.ended_at) - new Date(a.ended_at));

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Array.from({ length: 7 }, (_, index) => dateAtOffset(today, index - 6));
  const dailySeconds = new Map();
  const activeDays = new Set();
  const subjectSeconds = new Map();
  let totalSeconds = 0;
  let todaySeconds = 0;

  for (const session of completed) {
    const ended = new Date(session.ended_at);
    const key = dayKey(ended);
    const seconds = session.duration_seconds;
    totalSeconds += seconds;
    dailySeconds.set(key, (dailySeconds.get(key) ?? 0) + seconds);
    activeDays.add(key);
    if (key === dayKey(today)) todaySeconds += seconds;
    if (session.subject_id) subjectSeconds.set(session.subject_id, (subjectSeconds.get(session.subject_id) ?? 0) + seconds);
  }

  const weeklyActivity = days.map(date => ({
    date: dayKey(date),
    label: formatDay(date),
    seconds: dailySeconds.get(dayKey(date)) ?? 0,
  }));
  const weeklySeconds = weeklyActivity.reduce((sum, day) => sum + day.seconds, 0);

  let streak = 0;
  let cursor = activeDays.has(dayKey(today)) ? today : dateAtOffset(today, -1);
  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor = dateAtOffset(cursor, -1);
  }

  const subjectDurations = subjects.map(subject => ({
    subjectId: subject.id,
    name: subject.name,
    seconds: subjectSeconds.get(subject.id) ?? 0,
  }));
  const subjectIds = new Set(subjects.map(subject => subject.id));
  const deletedSubjectSeconds = [...subjectSeconds.entries()]
    .filter(([subjectId]) => !subjectIds.has(subjectId))
    .map(([subjectId, seconds]) => ({ subjectId, name: 'Removed subject', seconds }));
  const subjectDistribution = [...subjectDurations, ...deletedSubjectSeconds].sort((a, b) => b.seconds - a.seconds);
  const strongestSubject = subjectDurations.filter(subject => subject.seconds > 0).sort((a, b) => b.seconds - a.seconds)[0] ?? null;
  const weakestSubject = subjectDurations.length ? [...subjectDurations].sort((a, b) => a.seconds - b.seconds)[0] : null;
  const subjectNames = new Map(subjects.map(subject => [subject.id, subject.name]));
  const topicNames = new Map(subjects.flatMap(subject => (subject.topics ?? []).map(topic => [topic.id, topic.name])));
  const recentSessions = completed.slice(0, 8).map(session => ({
    ...session,
    subjectName: subjectNames.get(session.subject_id) ?? 'Removed subject',
    topicName: topicNames.get(session.topic_id) ?? '',
  }));

  return {
    totalSeconds,
    totalHours: totalSeconds / 3600,
    todaySeconds,
    weeklySeconds,
    completedSessions: completed.length,
    streak,
    weeklyActivity,
    subjectDistribution,
    strongestSubject,
    weakestSubject,
    recentSessions,
  };
}
