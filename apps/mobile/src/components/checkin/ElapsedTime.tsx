import React, { useEffect, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Text } from '../Text';

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** Live "time since" counter, e.g. 38:12 or 1:04:09. Updates every second. */
export function ElapsedTime({ since, style }: { since: string; style?: StyleProp<TextStyle> }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, style]} accessibilityLabel={`In the gym for ${format(now - new Date(since).getTime())}`}>
      {format(now - new Date(since).getTime())}
    </Text>
  );
}
