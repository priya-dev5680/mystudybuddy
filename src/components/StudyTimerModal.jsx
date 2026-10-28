import { useEffect, useState } from 'react';
import { AlertCircle, Check, Clock3, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';
import { formatStudyDuration } from '../utils/studyAnalytics.js';

const presets = [15, 25, 45, 60];

function clockTime(milliseconds) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function StudyTimerModal({ subjects, timer, saving, onStart, onPause, onResume, onReset, onDiscard, onFinish }) {
  const [draftSubjectId, setDraftSubjectId] = useState('');
  const [draftTopicId, setDraftTopicId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const session = timer.session;
  const locked = Boolean(session);
  const subjectId = session?.subjectId ?? draftSubjectId;
  const topicId = session?.topicId ?? draftTopicId;
  const subject = subjects.find(item => item.id === subjectId);
  const topics = subject?.topics ?? [];
  const progress = session ? Math.min(1, timer.elapsedMs / (session.durationSeconds * 1000)) : 0;

  useEffect(() => {
    if (!session && !draftSubjectId && subjects.length) setDraftSubjectId(subjects[0].id);
  }, [draftSubjectId, session, subjects]);

  function start() {
    if (!draftSubjectId) return;
    onStart({ subjectId: draftSubjectId, topicId: draftTopicId || null, durationMinutes });
  }

  function reset() {
    onReset();
    setConfirmDiscard(false);
  }

  function discard() {
    onDiscard();
    setConfirmDiscard(false);
  }

  return <>
    <span className="eyebrow">A LITTLE FOCUS TIME</span>
    <h2>Study session</h2>
    <p className="muted center">Choose a subject, settle in, and take it one step at a time.</p>
    <label className="timer-field">SUBJECT<select className="full-select" value={subjectId} disabled={locked || !subjects.length} onChange={event => { setDraftSubjectId(event.target.value); setDraftTopicId(''); }}><option value="">{subjects.length ? 'Choose a subject' : 'Add a subject first'}</option>{subjects.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <label className="timer-field">TOPIC <span className="timer-optional">OPTIONAL</span><select className="full-select topic-select" value={topicId || ''} disabled={locked || !subject || !topics.length} onChange={event => setDraftTopicId(event.target.value)}><option value="">{topics.length ? 'Choose a topic (optional)' : 'No topics yet'}</option>{topics.map(topic => <option value={topic.id} key={topic.id}>{topic.name}</option>)}</select></label>
    <div className="duration-choices" aria-label="Session length">{presets.map(minutes => <button type="button" className={(session ? session.durationSeconds / 60 : durationMinutes) === minutes ? 'selected' : ''} key={minutes} disabled={locked} onClick={() => setDurationMinutes(minutes)} aria-pressed={(session ? session.durationSeconds / 60 : durationMinutes) === minutes}>{minutes} min</button>)}</div>
    <div className={`study-timer-ring ${session?.status === 'paused' ? 'paused' : ''} ${session?.status === 'saving' ? 'saving' : ''}`} role="timer" aria-label={`${clockTime(timer.remainingMs)} remaining`}>
      <svg viewBox="0 0 180 180" aria-hidden="true"><circle className="timer-track" cx="90" cy="90" r="78"/><circle className="timer-progress" cx="90" cy="90" r="78" style={{ strokeDashoffset: 490.09 * (1 - progress) }}/></svg>
      <div className="study-timer-readout"><strong>{clockTime(session ? timer.remainingMs : durationMinutes * 60 * 1000)}</strong><span>{session?.status === 'paused' ? 'PAUSED' : session?.status === 'saving' ? 'SAVING' : session?.status === 'save-error' ? 'SAVE NEEDED' : session ? 'FOCUSING' : 'MINUTES TO YOU'}</span></div>
    </div>
    {session && <p className="timer-focused">Focused time: <b>{formatStudyDuration(Math.floor(timer.elapsedMs / 1000))}</b>{subject ? ` · ${subject.name}` : ''}</p>}
    {session?.status === 'save-error' && <div className="timer-error" role="alert"><AlertCircle size={16}/><span>{session.error || 'We could not save this session.'} Your timer is kept here so you can retry.</span></div>}
    {confirmDiscard && <div className="timer-discard-confirm" role="alert"><span>Discard this unfinished session without saving?</span><button type="button" className="btn secondary small" onClick={() => setConfirmDiscard(false)}>Keep it</button><button type="button" className="btn delete-small small" disabled={saving} onClick={discard}>Discard</button></div>}
    <div className="timer-controls">
      {!session && <button type="button" className="btn primary" onClick={start} disabled={!draftSubjectId}><Play size={16}/> Start session</button>}
      {session?.status === 'running' && <button type="button" className="btn secondary" onClick={onPause}><Pause size={16}/> Pause</button>}
      {session?.status === 'paused' && <button type="button" className="btn primary" onClick={onResume}><Play size={16}/> Resume</button>}
      {session && session.status !== 'saving' && <button type="button" className="btn dark" onClick={onFinish} disabled={saving || timer.elapsedMs < 1000}><Check size={15}/> {session.status === 'save-error' ? 'Retry save' : 'Finish & save'}</button>}
      {session && session.status !== 'saving' && <button type="button" className="btn text-btn" onClick={reset} disabled={saving}><RotateCcw size={15}/> Reset</button>}
    </div>
    {session && !confirmDiscard && session.status !== 'saving' && <button type="button" className="timer-discard" onClick={() => setConfirmDiscard(true)}><Trash2 size={14}/> Discard without saving</button>}
    {session?.status === 'saving' && <div className="timer-saving" role="status"><span className="auth-spinner"/> Saving your focused time…</div>}
    {!session && !subjects.length && <p className="timer-no-subject">Add a subject before starting a study session.</p>}
  </>;
}
