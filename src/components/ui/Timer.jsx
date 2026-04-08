import { useState, useEffect, useRef } from 'react';

function Timer({ totalSeconds, onExpire, onTick }) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const nowElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(nowElapsed);

      if (onTick) {
        onTick(nowElapsed);
      }

      if (nowElapsed >= totalSeconds && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(intervalRef.current);
        if (onExpire) {
          onExpire();
        }
      }
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, []);

  const remaining = Math.max(0, totalSeconds - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isWarning = remaining <= 60;

  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className={`timer-display ${isWarning ? 'timer-warning' : ''}`}>
      <span className="timer-label">Time Remaining:</span>
      <span className="timer-value">{formatted}</span>
    </div>
  );
}

export default Timer;
