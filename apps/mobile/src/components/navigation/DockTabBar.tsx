import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { FadeIn, interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SHADOW_1 } from '../../constants/theme';
import { fonts } from '../../theme/typography';
import { SPRING } from '../../theme/motion';
import { haptic } from '../../lib/haptics';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../Text';

const DOCK_HEIGHT = 58;

/**
 * Floating tab bar. The active tab widens and shows its label; the others show only the icon.
 * Icons come from each screen's `tabBarIcon` option, labels from `title`. `tabBarBadge` shows a count;
 * an empty string shows a small status dot in `tabBarBadgeStyle.backgroundColor`.
 */
export function DockTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const insets = useSafeAreaInsets();
  const keyboardOpen = useAndroidKeyboardOpen();

  // On Android the window resizes for the keyboard, which would lift the dock above it (e.g. in Chat).
  if (keyboardOpen) return null;

  return (
    <View style={[styles.outer, { backgroundColor: C.background, paddingBottom: Math.max(insets.bottom - 6, 10) }]}>
      <View style={[styles.dock, SHADOW_1, { backgroundColor: C.surface, borderColor: C.border }]} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              haptic.tap();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <DockItem
              key={route.key}
              label={label}
              focused={focused}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              badge={options.tabBarBadge}
              badgeColor={StyleSheet.flatten(options.tabBarBadgeStyle)?.backgroundColor as string | undefined}
              icon={options.tabBarIcon?.({
                focused,
                color: focused ? theme.primary : C.textMuted,
                size: 22,
              })}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            />
          );
        })}
      </View>
    </View>
  );
}

function useAndroidKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

function DockItem({
  label,
  focused,
  icon,
  badge,
  badgeColor,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  label: string;
  focused: boolean;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel: string;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING.bouncy);
  }, [focused, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    flexGrow: 1 + progress.value * 1.3,
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', theme.primaryMuted]),
  }));

  // A light gym colour (e.g. volt) is unreadable as text on a white dock, so light mode labels use body text.
  const labelColor = theme.colorScheme === 'dark' ? theme.primary : C.text;

  return (
    <Animated.View style={[styles.itemWrap, animatedStyle]}>
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        pressedScale={0.92}
        style={styles.item}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={accessibilityLabel}
      >
        <View>
          {icon}
          {badge === '' ? (
            <Animated.View entering={FadeIn} style={[styles.dot, { backgroundColor: badgeColor ?? C.error, borderColor: C.surface }]} />
          ) : badge != null ? (
            <View style={[styles.badge, { backgroundColor: badgeColor ?? C.error, borderColor: C.surface }]}>
              <Text style={[styles.badgeText, { color: C.background }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {focused ? (
          <Animated.Text entering={FadeIn.duration(180)} numberOfLines={1} style={[styles.label, { color: labelColor }]}>
            {label}
          </Animated.Text>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 12, paddingTop: 6 },
  dock: {
    height: DOCK_HEIGHT,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 5,
    gap: 2,
  },
  itemWrap: { flexBasis: 0, borderRadius: 17, overflow: 'hidden' },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  label: { fontFamily: fonts.headingBold, fontSize: 13, flexShrink: 1 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 9.5 },
  dot: { position: 'absolute', top: -2, right: -4, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
