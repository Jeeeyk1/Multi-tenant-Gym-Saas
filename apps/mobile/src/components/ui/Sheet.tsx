import React, { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/theme';
import { SPRING } from '../../theme/motion';
import { Text } from '../Text';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  /** Optional heading at the top of the sheet. */
  title?: string;
  children: ReactNode;
}

/**
 * Bottom sheet that sizes to its content (up to 85% of the screen), closes on drag down,
 * backdrop tap or Android back, and moves with the keyboard.
 * Inside a sheet, use `BottomSheetTextInput` from '@gorhom/bottom-sheet' instead of TextInput
 * so the keyboard pushes the sheet up.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const ref = useRef<BottomSheetModal>(null);
  const animationConfigs = useBottomSheetSpringConfigs(SPRING.gentle);
  // Callers often clear their data when closing (`visible={item !== null}`); keep the last
  // content on screen so the sheet doesn't collapse while it slides away.
  const lastContent = useRef({ title, children });
  if (visible) lastContent.current = { title, children };

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.55} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      onDismiss={onClose}
      maxDynamicContentSize={height * 0.85}
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{ backgroundColor: C.surface, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: C.border, width: 40 }}
      accessible={false}
    >
      <BottomSheetScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.lg }]}>
        {lastContent.current.title ? (
          <Text variant="h3" style={{ color: C.text }} accessibilityRole="header">
            {lastContent.current.title}
          </Text>
        ) : null}
        {lastContent.current.children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: SPACING.sm, gap: 14 },
});
