import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

const STORE_KEY = 'activeWorkoutSession';
const IDLE_WARN_MINUTES = 25;
const AUTO_STOP_MINUTES = 240; // 4 hours
const IDLE_NOTIFICATION_ID = 'workout-idle-check';

interface ActiveSession {
  workoutType: string;
  startedAt: string; // ISO string
}

interface WorkoutContextValue {
  activeSession: ActiveSession | null;
  showIdlePrompt: boolean;
  startSession: (workoutType: string) => Promise<void>;
  confirmStillWorking: () => void;
  endSession: () => { startedAt: string; endedAt: string; durationMinutes: number; workoutType: string };
  dismissIdlePrompt: () => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
}

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [showIdlePrompt, setShowIdlePrompt] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endSessionRef = useRef<(() => void) | null>(null);

  // Restore persisted session on mount (app was killed mid-session)
  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const session = JSON.parse(raw) as ActiveSession;
        const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 60_000;
        // If > 4 hours have passed while app was closed, discard the orphaned session
        if (elapsed > AUTO_STOP_MINUTES) {
          SecureStore.deleteItemAsync(STORE_KEY);
          return;
        }
        setActiveSession(session);
        scheduleIdleCheck(session.startedAt);
      } catch {
        SecureStore.deleteItemAsync(STORE_KEY);
      }
    });
  }, []);

  function clearTimers() {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    Notifications.cancelScheduledNotificationAsync(IDLE_NOTIFICATION_ID).catch(() => {});
  }

  function scheduleIdleCheck(startedAtIso: string) {
    clearTimers();

    const elapsed = Date.now() - new Date(startedAtIso).getTime();
    const idleDelay = Math.max(0, IDLE_WARN_MINUTES * 60_000 - elapsed);
    const autoDelay = Math.max(0, AUTO_STOP_MINUTES * 60_000 - elapsed);

    // In-app idle prompt (while app is foregrounded)
    idleTimerRef.current = setTimeout(() => {
      setShowIdlePrompt(true);
    }, idleDelay);

    // Auto-stop hard limit
    autoStopRef.current = setTimeout(() => {
      endSessionRef.current?.();
    }, autoDelay);

    // Background notification (fires when app is not in foreground)
    Notifications.scheduleNotificationAsync({
      identifier: IDLE_NOTIFICATION_ID,
      content: {
        title: 'Still working out? 💪',
        body: 'Tap to confirm or your session will auto-stop in a bit.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.floor(idleDelay / 1000)) },
    }).catch(() => {});
  }

  const startSession = useCallback(async (workoutType: string) => {
    const session: ActiveSession = { workoutType, startedAt: new Date().toISOString() };
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(session));
    setActiveSession(session);
    setShowIdlePrompt(false);
    scheduleIdleCheck(session.startedAt);
  }, []);

  const endSession = useCallback(() => {
    const session = activeSession;
    if (!session) throw new Error('No active session');

    clearTimers();
    SecureStore.deleteItemAsync(STORE_KEY);
    setActiveSession(null);
    setShowIdlePrompt(false);

    const endedAt = new Date().toISOString();
    const durationMinutes = Math.max(
      1,
      Math.round((new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000),
    );

    return { startedAt: session.startedAt, endedAt, durationMinutes, workoutType: session.workoutType };
  }, [activeSession]);

  // Keep endSession ref current so auto-stop timeout can call it
  useEffect(() => {
    endSessionRef.current = () => {
      try { endSession(); } catch { /* auto-stop tolerates endSession failures */ }
    };
  }, [endSession]);

  const confirmStillWorking = useCallback(() => {
    setShowIdlePrompt(false);
    if (activeSession) scheduleIdleCheck(activeSession.startedAt);
  }, [activeSession]);

  const dismissIdlePrompt = useCallback(() => {
    setShowIdlePrompt(false);
  }, []);

  return (
    <WorkoutContext.Provider value={{ activeSession, showIdlePrompt, startSession, confirmStillWorking, endSession, dismissIdlePrompt }}>
      {children}
    </WorkoutContext.Provider>
  );
}
