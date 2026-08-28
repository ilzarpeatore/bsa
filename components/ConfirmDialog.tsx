import React, { useMemo } from 'react';
import {  View, Text, StyleSheet, Modal, Pressable  } from 'react-native';
import {  Ionicons  } from '@expo/vector-icons';
import { FONT, SHADOW, RADIUS } from '../pages/migrated/theme';
import {  useAppColorMode  } from '@helper/useAppColorMode';

interface Props {
  visible: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Dialogo de confirmacion con diseno propio de la app (tarjeta redondeada,
 * paleta Bevel) - reemplaza Alert.alert nativo, que usa el diseno del
 * sistema operativo (distinto en Android/iOS, no theming posible).
 */
function ConfirmDialog({
  visible,
  icon = 'alert-circle-outline',
  iconColor,
  iconBg,
  title,
  message,
  confirmText,
  cancelText = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const resolvedIconColor = iconColor ?? (destructive ? C.destructive50 : C.textPrimary);
  const resolvedIconBg = iconBg ?? (destructive ? C.destructive5 : C.gray5);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconWrap, { backgroundColor: resolvedIconBg }]}>
            <Ionicons name={icon} size={26} color={resolvedIconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.75 }]}
              onPress={onCancel}
            >
              <Text style={styles.cancelBtnText}>{cancelText}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                destructive && styles.confirmBtnDestructive,
                pressed && { opacity: 0.85 },
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmBtnText, !destructive && { color: C.accentBlackForeground }]}>{confirmText}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const ConfirmDialogMem = React.memo(ConfirmDialog);
export default ConfirmDialog;

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    ...SHADOW.card,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: FONT.extraBold,
    fontSize: 17,
    color: C.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONT.regular,
    fontSize: 13.5,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    backgroundColor: C.gray5,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.textPrimary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    backgroundColor: C.accentBlack,
    alignItems: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: C.destructive50,
  },
  confirmBtnText: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  });
}
