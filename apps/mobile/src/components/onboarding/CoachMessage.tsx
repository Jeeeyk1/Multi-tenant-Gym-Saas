import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { CoachMascot } from './CoachMascot';
import { useTheme } from '../../context/ThemeContext';
import { useInstantContent } from './use-reduce-motion';

const MS_PER_CHAR = 22;

interface CoachMessageProps {
  /** Lines are typed one after another, each in its own bubble. */
  lines: string[];
  /** Show the small coach next to the bubbles. Off when a big coach is on screen. */
  avatar?: boolean;
  /** Center the bubbles (used under the big welcome coach). */
  centered?: boolean;
  /** Called once every line has finished typing (or was skipped). */
  onDone?: () => void;
}

/**
 * The coach "typing" a message. Tap to show it all at once; with reduce motion
 * on (or a screen reader running), the text appears immediately.
 */
export function CoachMessage({ lines, avatar = true, centered = false, onDone }: CoachMessageProps) {
  const { theme } = useTheme();
  const instant = useInstantContent();
  const fullText = lines.join('\n');
  const [shown, setShown] = useState(instant ? fullText.length : 0);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setShown(instant ? fullText.length : 0);
  }, [fullText, instant]);

  useEffect(() => {
    if (shown >= fullText.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    const timer = setTimeout(() => setShown((n) => n + 1), MS_PER_CHAR);
    return () => clearTimeout(timer);
  }, [shown, fullText, onDone]);

  // Split the typed prefix back into lines so each keeps its own bubble.
  let remaining = shown;
  const visible = lines.map((line) => {
    const part = line.slice(0, Math.max(0, remaining));
    remaining -= line.length + 1;
    return part;
  });

  return (
    <Pressable
      onPress={() => setShown(fullText.length)}
      accessibilityRole="text"
      accessibilityLabel={fullText}
      style={styles.row}
    >
      {avatar && (
        <View style={styles.avatar}>
          <CoachMascot size={52} talking={shown < fullText.length} />
        </View>
      )}
      <View style={[styles.bubbles, centered && styles.centered]} importantForAccessibility="no-hide-descendants">
        {visible.map((text, i) =>
          text.length > 0 ? (
            <View
              key={i}
              style={[
                styles.bubble,
                centered && styles.bubbleCentered,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <Text variant="bodyMed" style={{ color: theme.colors.text, textAlign: centered ? 'center' : 'left' }}>
                {text}
              </Text>
            </View>
          ) : null,
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { marginTop: -6 },
  bubbles: { flex: 1, gap: 8 },
  centered: { alignItems: 'center' },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  bubbleCentered: { alignSelf: 'center', borderTopLeftRadius: 16 },
});
