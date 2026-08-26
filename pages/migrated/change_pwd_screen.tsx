import React, { useState, useRef, useMemo } from 'react';
import {  ScrollView, Keyboard, StyleSheet  } from 'react-native';
import { showToast } from '@helper/toast';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  HStack  } from '@components/ui/hstack';
import {  VStack  } from '@components/ui/vstack';
import {  Button, ButtonText  } from '@components/ui/button';
import {  Input, InputField, InputSlot  } from '@components/ui/input';
import {  Icon  } from '@components/ui/icon';
import {  Spinner  } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import AppIcon from '@components/AppIcon';
import {  authApi  } from '@api/auth';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import { FONT, RADIUS } from './theme';
export default function ChangePwdScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);
  // Mismo rediseño que edit_profile_screen.tsx (pedido explícito: "el mismo
  // diseño de interfaz que le diste a EditProfile"): badge de icono de color
  // por fila (AppIcon), tarjeta blanca de verdad con etiqueta de sección
  // encima, en vez de una tarjeta gris con filas de solo texto.
  const FIELD_ICON = {
    old: { icon: 'lock-closed-outline' as const, color: C.destructive },
    new: { icon: 'key-outline' as const, color: C.blue },
    confirm: { icon: 'shield-checkmark-outline' as const, color: C.success },
  };

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [oldSecure, setOldSecure] = useState(true);
  const [newSecure, setNewSecure] = useState(true);
  const [confirmSecure, setConfirmSecure] = useState(true);

  // Tipado como `any`: el ref forwarding de InputField (createInput de
  // gluestack) expone un tipo Ref<TextInputProps> en vez de la instancia de
  // TextInput — en runtime sigue siendo el TextInput real (.focus() funciona).
  const newPasswordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);

  const changePwd = async () => {
    Keyboard.dismiss();
    if (!oldPassword.trim()) {
      showToast('Error', { description: 'Introduce tu contraseña actual', variant: 'error' });
      return;
    }
    if (!newPassword.trim()) {
      showToast('Error', { description: 'Introduce una contraseña nueva', variant: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      showToast('Error', { description: 'La contraseña debe tener al menos 8 caracteres', variant: 'error' });
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      showToast('Error', { description: 'Las contraseñas no coinciden', variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({ old_password: oldPassword.trim(), new_password: newPassword.trim() });
      setLoading(false);
      showToast('Listo', { description: 'Contraseña cambiada correctamente', variant: 'success' });
      navigation.goBack();
    } catch (e: any) {
      setLoading(false);
      showToast('Error', { description: e?.message ?? 'No se pudo cambiar la contraseña', variant: 'error' });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Cambiar contraseña" onBack={() => navigation.goBack()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text size="sm" muted style={{ marginBottom: 20 }}>
          Introduce tu contraseña actual y elige una contraseña nueva.
        </Text>

        {/* Campos agrupados en una tarjeta blanca con badge de icono por
            fila -- mismo rediseño que edit_profile_screen.tsx (pedido
            explícito, misma captura de referencia de la pantalla "Ajustes"
            de Bevel). */}
        <Text style={localStyles.sectionLabel}>Contraseña</Text>
        <Box style={localStyles.card}>
          <Box style={localStyles.row}>
            <HStack space="md" className="items-center">
              <AppIcon name={FIELD_ICON.old.icon} color="#FFFFFF" bg={FIELD_ICON.old.color} containerSize={40} borderRadius={12} />
              <VStack className="flex-1">
                <Text style={localStyles.label}>Contraseña actual</Text>
                <Input style={localStyles.input}>
                  <InputField
                    className="text-sm"
                    style={{ color: C.textPrimary }}
                    placeholder="Introduce tu contraseña actual"
                    placeholderTextColor={C.gray40}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry={oldSecure}
                    returnKeyType="next"
                    onSubmitEditing={() => newPasswordRef.current?.focus()}
                  />
                  <InputSlot className="pr-1" onPress={() => setOldSecure(!oldSecure)}>
                    <Icon name={oldSecure ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.gray40} />
                  </InputSlot>
                </Input>
              </VStack>
            </HStack>
          </Box>

          <Box style={localStyles.row}>
            <HStack space="md" className="items-center">
              <AppIcon name={FIELD_ICON.new.icon} color="#FFFFFF" bg={FIELD_ICON.new.color} containerSize={40} borderRadius={12} />
              <VStack className="flex-1">
                <Text style={localStyles.label}>Contraseña nueva</Text>
                <Input style={localStyles.input}>
                  <InputField
                    ref={newPasswordRef}
                    className="text-sm"
                    style={{ color: C.textPrimary }}
                    placeholder="Introduce tu contraseña nueva"
                    placeholderTextColor={C.gray40}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={newSecure}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  />
                  <InputSlot className="pr-1" onPress={() => setNewSecure(!newSecure)}>
                    <Icon name={newSecure ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.gray40} />
                  </InputSlot>
                </Input>
              </VStack>
            </HStack>
          </Box>

          <Box style={[localStyles.row, localStyles.rowLast]}>
            <HStack space="md" className="items-center">
              <AppIcon name={FIELD_ICON.confirm.icon} color="#FFFFFF" bg={FIELD_ICON.confirm.color} containerSize={40} borderRadius={12} />
              <VStack className="flex-1">
                <Text style={localStyles.label}>Confirmar contraseña</Text>
                <Input style={localStyles.input}>
                  <InputField
                    ref={confirmPasswordRef}
                    className="text-sm"
                    style={{ color: C.textPrimary }}
                    placeholder="Confirma tu contraseña nueva"
                    placeholderTextColor={C.gray40}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={confirmSecure}
                    returnKeyType="done"
                    onSubmitEditing={changePwd}
                  />
                  <InputSlot className="pr-1" onPress={() => setConfirmSecure(!confirmSecure)}>
                    <Icon name={confirmSecure ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.gray40} />
                  </InputSlot>
                </Input>
              </VStack>
            </HStack>
          </Box>
        </Box>

        {confirmPassword.length > 0 && confirmPassword !== newPassword && (
          <Text size="xs" className="text-destructive" style={{ marginTop: 8, marginLeft: 4 }}>Las contraseñas no coinciden</Text>
        )}

        {/* Submit */}
        <Button size="lg" radius="pill" onPress={changePwd} className="w-full" style={{ marginTop: 24 }}>
          <ButtonText>Guardar</ButtonText>
        </Button>
      </ScrollView>

      {loading && (
        <Box
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          className="items-center justify-center"
        >
          <Spinner size="large" color={C.orange} />
        </Box>
      )}
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    // Tarjeta blanca de verdad (antes C.gray80, mismo tono que el fondo de la
    // pantalla) -- mismo fix que edit_profile_screen.tsx.
    card: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
    },
    sectionLabel: {
      fontFamily: FONT.semiBold,
      fontSize: 13,
      color: C.textSecondary,
      marginBottom: 8,
      marginLeft: 4,
    },
    row: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    label: {
      fontFamily: FONT.medium,
      fontSize: 13,
      color: C.textSecondary,
      marginBottom: 4,
    },
    input: {
      borderWidth: 0,
      height: 26,
      backgroundColor: 'transparent',
    },
  });
}
