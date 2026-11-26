import React from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../constants/theme';
import { Text } from '../Text';
import { Button, Sheet } from '../ui';

interface CheckinQrSheetProps {
  visible: boolean;
  onClose: () => void;
  qrCodeToken: string | undefined;
  membershipNumber: string | undefined;
}

/** The member's check-in QR, for staff to scan at the desk. Same code as on Profile. */
export function CheckinQrSheet({ visible, onClose, qrCodeToken, membershipNumber }: CheckinQrSheetProps) {
  const { theme } = useTheme();
  const C = theme.colors;

  return (
    <Sheet visible={visible} onClose={onClose} title="Your check-in QR">
      <View style={styles.qrWrap}>
        {qrCodeToken ? <QRCode value={qrCodeToken} size={200} backgroundColor="#ffffff" color="#000000" /> : null}
      </View>
      <Text variant="label" style={{ color: C.textMuted, textAlign: 'center' }}>
        {membershipNumber ? `Member #${membershipNumber} · ` : ''}Staff scan this at the desk.
      </Text>
      <Button label="Done" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // QR codes need a white quiet zone to scan reliably, in both themes.
  qrWrap: { alignSelf: 'center', padding: 16, backgroundColor: '#ffffff', borderRadius: RADIUS.lg },
});
