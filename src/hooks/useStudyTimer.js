import { useCallback, useEffect, useRef, useState } from 'react';
import { loadValue, removeValue, saveValue } from '../services/localStore.js';
import { saveStudySession } from '../services/studySessionsService.js';

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
    const random = Math.random() * 16 | 0;
    return (token === 'x' ? random : (random & 3 | 8)).toString(16);
  });
}

export function getFocusedMilliseconds(session, now = Date.now()) {
  if (!session) return 0;
  const currentSegment = session.status === 'running' && session.runStartedAt
    ? Math.max(0, now - session.runStartedAt)
    : 0;
  return Math.min(session.durationSeconds * 1000, session.focusedMs + currentSegment);
}

export function useStudyTimer(userId, { onSaved, onError } = {}) {
  const storageKey = `active-study-timer:${userId}`;
  const [session, setSession] = useState(() => loadValue(storageKey, null));
  const [now, setNow] = useState(Date.now());
  const sessionRef = useRef(session);
  const savingRef = useRef(false);
  const recoveryRef = useRef(false);
  const callbacksRef = useRef({ onSaved, onError });
  callbacksRef.current = { onSaved, onError };

  const storeSession = useCallback(next => {
    sessionRef.current = next;
    setSession(next);
    if (next) saveValue(storageKey, next);
    else removeValue(storageKey);
  }, [storageKey]);

  const finish = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || savingRef.current || current.status === 'saved') return;
    const focusedMs = getFocusedMilliseconds(current);
    const durationSeconds = Math.floor(focusedMs / 1000);
    if (durationSeconds <= 0) return;

    const completedAt = current.status === 'running' && focusedMs >= current.durationSeconds * 1000
      ? current.runStartedAt + Math.max(0, current.durationSeconds * 1000 - current.focusedMs)
      : Date.now();
    const endedAt = current.endedAt ?? new Date(completedAt).toISOString();
    const finalized = { ...current, status: 'saving', focusedMs, runStartedAt: null, endedAt };
    storeSession(finalized);
    savingRef.current = true;
    try {
      const saved = await saveStudySession({
        id: finalized.id,
        user_id: userId,
        subject_id: finalized.subjectId,
        topic_id: finalized.topicId,
        duration_seconds: durationSeconds,
        started_at: finalized.startedAt,
        ended_at: finalized.endedAt,
      });
      storeSession(null);
      callbacksRef.current.onSaved?.(saved);
    } catch (error) {
      storeSession({ ...finalized, status: 'save-error', error: error?.message ?? 'Unable to save this session.' });
      callbacksRef.current.onError?.(error);
    } finally {
      savingRef.current = false;
    }
  }, [storeSession, userId]);

  const start = useCallback(({ subjectId, topicId, durationMinutes }) => {
    if (!subjectId || sessionRef.current) return false;
    const time = Date.now();
    storeSession({
      id: makeId(),
      status: 'running',
      subjectId,
      topicId: topicId || null,
      durationSeconds: durationMinutes * 60,
      startedAt: new Date(time).toISOString(),
      focusedMs: 0,
      runStartedAt: time,
      endedAt: null,
    });
    return true;
  }, [storeSession]);

  const pause = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.status !== 'running') return;
    const focusedMs = getFocusedMilliseconds(current);
    if (focusedMs >= current.durationSeconds * 1000) {
      finish();
      return;
    }
    storeSession({ ...current, status: 'paused', focusedMs, runStartedAt: null });
  }, [finish, storeSession]);

  const resume = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.status !== 'paused') return;
    if (current.focusedMs >= current.durationSeconds * 1000) {
      finish();
      return;
    }
    storeSession({ ...current, status: 'running', runStartedAt: Date.now() });
  }, [finish, storeSession]);

  const discard = useCallback(() => {
    if (savingRef.current) return;
    storeSession(null);
  }, [storeSession]);

  const reset = useCallback(() => {
    if (savingRef.current) return;
    storeSession(null);
  }, [storeSession]);

  useEffect(() => {
    if (session?.status !== 'running') return undefined;
    const id = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (getFocusedMilliseconds(sessionRef.current, time) >= sessionRef.current.durationSeconds * 1000) finish();
    }, 500);
    return () => window.clearInterval(id);
  }, [session?.status, finish]);

  useEffect(() => {
    if (recoveryRef.current) return;
    recoveryRef.current = true;
    if (sessionRef.current?.status === 'saving') finish();
  }, [finish]);

  const elapsedMs = getFocusedMilliseconds(session, now);
  const remainingMs = session ? Math.max(0, session.durationSeconds * 1000 - elapsedMs) : 0;
  return { session, elapsedMs, remainingMs, start, pause, resume, reset, discard, finish, setNow };
}
