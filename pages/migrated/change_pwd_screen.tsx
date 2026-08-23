import React, { useState, useRef } from 'react';
import { ScrollView, Alert, Keyboard, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button, ButtonText } from '@components/ui/button';
import { Input, InputField, InputSlot } from '@components/ui/input';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { authApi } from '@api/auth';
import { C, FONT } from './theme';

export default function ChangePwdScreen({ navigation }: any) {

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
      Alert.alert('Error', 'Introduce tu contraseña actual');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Introduce una contraseña nueva');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({ old_password: oldPassword.trim(), new_password: newPassword.trim() });
      setLoading(false);
      Alert.alert('Listo', 'Contraseña cambiada correctamente');
      navigation.goBack();
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e?.message ?? 'No se pudo cambiar la contraseña');
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

        {/* Campos agrupados en una sola tarjeta con separadores -- mismo
            patrón de lista que edit_profile_screen.tsx/profile_screen.tsx. */}
        <Box style={localStyles.card}>
          <Box style={localStyles.row}>
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
          </Box>

          <Box style={localStyles.row}>
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
          </Box>

          <Box style={[localStyles.row, localStyles.rowLast]}>
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
          </Box>
        </Box>

        {confirmPassword.length > 0 && confirmPassword !== newPassword && (
          <Text size="xs" className="text-destructive" style={{ marginTop: 8, marginLeft: 4 }}>Las contraseñas no coinciden</Text>
        )}

        {/* Submit */}
        <Button onPress={changePwd} className="w-full" style={{ marginTop: 24 }}>
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

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: C.gray80,
    borderRadius: 16,
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
