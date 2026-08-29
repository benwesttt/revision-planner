import { useContext } from 'react';
import { TimerContext } from './timer-context-object';

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within a TimerProvider');
  return ctx;
}
