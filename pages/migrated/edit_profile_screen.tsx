import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { showToast } from '@helper/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { HStack } from '@components/ui/hstack';
import { VStack } from '@components/ui/vstack';
import { Button, ButtonText } from '@components/ui/button';
import { Input, InputField } from '@components/ui/input';
import ScreenHeader from '@components/ScreenHeader';
import AppIcon from '@components/AppIcon';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAuth } from '@store/AuthContext';
import { authApi } from '@api/auth';
import { useAppColorMode } from '@helper/useAppColorMode';
import { FONT, RADIUS } from './theme';

interface EditProfileScreenProps {
  navigation: any;
}

function getGender() {
  const genderList = [
    { id: 0, label: 'Hombre', key: 'male' },
    { id: 1, label: 'Mujer', key: 'female' },
  ];
  return genderList;
}

function initialsFor(fName: string, lName: string): string {
  const letters = [fName[0], lName[0]].filter(Boolean).join('').toUpperCase();
  return letters || 'U';
}

// `profile_image` no es una columna plana de `users` (se calcula vía
// getSingleMedia(), mismo patrón que el bug real documentado para
// community_screen.tsx en docs/TAREAS.md) -- mandar la uri local del
// picker como string JSON no sube ningún fichero real, hace falta
// multipart con el fichero, igual que ya hace api/posts.ts para los
// medios de una publicación. Los demás campos (incluido el objeto
// anidado user_profile) van como texto plano en bracket notation
// (user_profile[age], etc.), que es como Laravel espera arrays anidados
// dentro de un multipart/form-data.
function buildProfileFormData(payload: Record<string, any>, imageUri: string) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        formData.append(`${key}[${subKey}]`, String(subValue ?? ''));
      });
    } else {
      formData.append(key, String(value ?? ''));
    }
  });
  const ext = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  formData.append('profile_image', { uri: imageUri, name: `profile-${Date.now()}.${ext}`, type: `image/${ext}` } as any);
  return formData;
}

export default function EditProfileScreen(props: EditProfileScreenProps) {
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);

  // Color/icono por campo, reutilizando AppIcon (mismo patrón de badge
  // cuadrado redondeado + icono ya usado en Home) -- pedido explícito, misma
  // captura de referencia que la pantalla "Ajustes" de Bevel: filas agrupadas
  // en tarjetas blancas con un badge de color por fila en vez de la lista
  // plana de antes. Aquí no hay chevron de navegación (a diferencia de la
  // referencia) porque cada fila se edita in-situ, no lleva a otra pantalla.
  const FIELD_ICON = {
    name: { icon: 'person-outline' as const, color: C.blue },
    email: { icon: 'mail-outline' as const, color: C.purple60 },
    phone: { icon: 'call-outline' as const, color: C.success },
    gender: { icon: 'male-female-outline' as const, color: C.pink },
    age: { icon: 'calendar-outline' as const, color: C.warning },
    weight: { icon: 'barbell-outline' as const, color: C.destructive },
    height: { icon: 'resize-outline' as const, color: '#14B8A6' },
  };

  const { updateUser, state, logout } = useAuth();
  const [fName, setFName] = useState('');
  const [lName, setLName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [weight, setWeight] = useState('');
  const [heightVal, setHeightVal] = useState('');
  const genderRef = useRef('female');
  const [selectGender, setSelectGender] = useState(0);
  const [profileImage, setProfileImage] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mHeight, setMHeight] = useState<number | undefined>(undefined);
  const [mWeight, setMWeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    if (state.user) {
      setFName(state.user.first_name ?? '');
      setLName(state.user.last_name ?? '');
      setEmail(state.user.email ?? '');
      setPhoneNumber(state.user.phone_number ?? '');
      genderRef.current = state.user.gender || 'female';
      setProfileImage(state.user.profile_image ?? '');
      setSelectGender(state.user.gender === 'male' ? 0 : 1);
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permiso denegado', { description: 'Necesitamos acceso a tu galería para cambiar la foto de perfil.', variant: 'warning' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permiso denegado', { description: 'Necesitamos acceso a tu cámara para hacer una foto.', variant: 'warning' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImage = () => {
    Alert.alert('Cambiar foto de perfil', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Elegir de la galería', onPress: pickFromLibrary },
      { text: 'Hacer una foto', onPress: pickFromCamera },
    ]);
  };

  const convertFeetToCm = () => {
    const val = parseFloat(heightVal) || 0;
    const cm = val * 30.48;
    if (heightVal) setHeightVal(cm.toFixed(2));
  };

  const convertCMToFeet = () => {
    const val = parseFloat(heightVal) || 0;
    const feet = val * 0.0328;
    if (heightVal) setHeightVal(feet.toFixed(2));
  };

  const convertLbsToKg = () => {
    const val = parseFloat(weight) || 0;
    const kg = val * 0.45359237;
    if (weight) setWeight(kg.toFixed(2));
  };

  const convertKgToLbs = () => {
    const val = parseFloat(weight) || 0;
    const lbs = val * 2.2046;
    if (weight) setWeight(lbs.toFixed(2));
  };

  const save = async () => {
    setIsLoading(true);
    try {
      // Dos bugs reales corregidos aquí:
      // 1) UserRequest::rules() exige 'username' siempre en rutas api/* —
      //    como este payload nunca lo mandaba, TODO guardado desde Edit
      //    Profile fallaba con 422 "username field is required" (no solo
      //    age/weight/height, ningún campo se llegaba a guardar nunca).
      // 2) UserController::updateProfile solo escribe en user_profiles
      //    cuando el payload trae la clave anidada "user_profile" —
      //    age/weight/height sueltos en el nivel superior se descartan en
      //    silencio porque no son fillable en el modelo User.
      const payload: Record<string, any> = {
        first_name: fName.trim(),
        last_name: lName.trim(),
        email: email.trim(),
        username: state.user?.username,
        phone_number: phoneNumber.trim(),
        gender: genderRef.current,
        user_profile: {
          age: age.trim(),
          weight: weight.trim(),
          height: heightVal.trim(),
        },
      };
      const body = imageUri ? buildProfileFormData(payload, imageUri) : payload;
      const response = await authApi.updateProfile(body, !!imageUri);
      if (state.user) {
        updateUser({
          ...state.user,
          ...payload,
          profile_image: response.data?.data?.profile_image ?? state.user.profile_image,
          user_profile: { ...state.user.user_profile, ...payload.user_profile },
        });
      }
      props.navigation.goBack();
    } catch (e: any) {
      showToast('Error', { description: e.message || 'No se pudo guardar', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Requisito de Apple (guideline 5.1.1v) y Google Play para poder publicar
  // la app: si permite crear cuenta, tiene que permitir borrarla desde
  // dentro, sin depender de un email/llamada a soporte. Doble confirmación
  // (no solo una Alert, a diferencia de "Cerrar sesión") porque esto sí es
  // irreversible -- ver docs/BORRADO_CUENTA_BACKEND.md para el contrato de
  // backend, que todavía no existe (este botón llamará a un 404 hasta que se
  // implemente ahí).
  const deleteAccount = async () => {
    setIsDeleting(true);
    try {
      await authApi.deleteAccount();
      await logout();
    } catch (e: any) {
      showToast('Error', { description: e.message || 'No se pudo eliminar la cuenta. Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteAccountFinal = () => {
    Alert.alert(
      '¿Seguro que quieres eliminar tu cuenta?',
      'Esta acción es definitiva. No podrás recuperar tu cuenta ni tus datos después de confirmar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar definitivamente', style: 'destructive', onPress: deleteAccount },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Se eliminarán tu perfil, tu progreso, tus entrenamientos registrados y el resto de tus datos personales. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', style: 'destructive', onPress: confirmDeleteAccountFinal },
      ]
    );
  };

  const genderList = getGender();
  const fullName = `${fName} ${lName}`.trim() || 'Usuario';

  const renderProfileImage = () => {
    const uri = imageUri || profileImage;
    if (uri) {
      return (
        <Box style={localStyles.avatarCircle}>
          <Image source={{ uri }} contentFit="cover" style={localStyles.avatarImage} />
        </Box>
      );
    }
    return (
      <Box style={localStyles.avatarCircle}>
        <Text weight="bold" size="2xl" style={{ color: '#FFFFFF' }}>{initialsFor(fName, lName)}</Text>
      </Box>
    );
  };

  const renderHeightOption = (label: string, index: number) => {
    const isActive = mHeight === index;
    return (
      <Button
        variant="outline"
        style={[localStyles.unitBtn, isActive && localStyles.unitBtnActive] as any}
        onPress={() => {
          setMHeight(index);
          if (index === 1) {
            convertFeetToCm();
          } else {
            convertCMToFeet();
          }
        }}
      >
        <ButtonText style={[localStyles.unitBtnText, isActive && localStyles.unitBtnTextActive] as any}>
          {label}
        </ButtonText>
      </Button>
    );
  };

  const renderWeightOption = (label: string, index: number) => {
    const isActive = mWeight === index;
    return (
      <Button
        variant="outline"
        style={[localStyles.unitBtn, isActive && localStyles.unitBtnActive] as any}
        onPress={() => {
          setMWeight(index);
          if (index === 0) {
            convertKgToLbs();
          } else {
            convertLbsToKg();
          }
        }}
      >
        <ButtonText style={[localStyles.unitBtnText, isActive && localStyles.unitBtnTextActive] as any}>
          {label}
        </ButtonText>
      </Button>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader
        title="Editar perfil"
        onBack={() => props.navigation.goBack()}
        rightAction={
          <Pressable onPress={save} disabled={isLoading} style={{ minWidth: 40, alignItems: 'flex-end' }}>
            <Text weight="bold" size="sm" style={{ color: isLoading ? C.gray30 : C.orange }}>
              Guardar
            </Text>
          </Pressable>
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <Box style={localStyles.imageSection}>
            {renderProfileImage()}
            <Pressable
              style={localStyles.cameraBtn}
              onPress={pickImage}
              accessibilityRole="button"
              accessibilityLabel="Cambiar foto de perfil">
              <Icon name="camera" size={14} color="#FFFFFF" />
            </Pressable>
            <Text weight="bold" size="lg" style={{ marginTop: 12 }}>{fullName}</Text>
            <Pressable onPress={pickImage}>
              <Text size="sm" muted style={{ marginTop: 2 }}>Cambiar foto</Text>
            </Pressable>
          </Box>

          {/* Datos personales -- agrupados en tarjetas blancas con badge de
              icono por fila (pedido explícito, misma captura de referencia
              que la pantalla "Ajustes" de Bevel: General/Datos/Recursos como
              tarjetas separadas con etiqueta de sección encima). Antes era
              una sola tarjeta gris (C.gray80, casi el mismo tono que el
              fondo de la pantalla) con filas de solo texto -- ahora tarjetas
              realmente blancas (C.surface) que destacan del fondo, igual que
              en la referencia. */}
          <Text style={localStyles.sectionLabel}>Datos personales</Text>
          <Box style={localStyles.card}>
            <Box style={localStyles.row}>
              <HStack space="md" className="items-center">
                <AppIcon name={FIELD_ICON.name.icon} color="#FFFFFF" bg={FIELD_ICON.name.color} containerSize={40} borderRadius={12} />
                <VStack className="flex-1">
                  <Text style={localStyles.label}>Nombre</Text>
                  <Input style={localStyles.input}>
                    <InputField
                      className="text-sm"
                      style={{ color: C.textPrimary }}
                      value={fName}
                      onChangeText={setFName}
                      placeholder="Nombre"
                      placeholderTextColor={C.gray40}
                    />
                  </Input>
                </VStack>
              </HStack>
            </Box>

            <Box style={localStyles.row}>
              <HStack space="md" className="items-center">
                <AppIcon name={FIELD_ICON.name.icon} color="#FFFFFF" bg={FIELD_ICON.name.color} containerSize={40} borderRadius={12} />
                <VStack className="flex-1">
                  <Text style={localStyles.label}>Apellidos</Text>
                  <Input style={localStyles.input}>
                    <InputField
                      className="text-sm"
                      style={{ color: C.textPrimary }}
                      value={lName}
                      onChangeText={setLName}
                      placeholder="Apellidos"
                      placeholderTextColor={C.gray40}
                    />
                  </Input>
                </VStack>
              </HStack>
            </Box>

            <Box style={localStyles.row}>
              <HStack space="md" className="items-center">
                <AppIcon name={FIELD_ICON.email.icon} color="#FFFFFF" bg={FIELD_ICON.email.color} containerSize={40} borderRadius={12} />
                <VStack className="flex-1">
                  <Text style={localStyles.label}>Email</Text>
                  <Input style={localStyles.input}>
                    <InputField
                      className="text-sm"
                      style={{ color: C.textPrimary }}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email"
                      placeholderTextColor={C.gray40}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </Input>
                </VStack>
              </HStack>
            </Box>

            <Box style={[localStyles.row, localStyles.rowLast]}>
              <HStack space="md" className="items-center">
                <AppIcon name={FIELD_ICON.phone.icon} color="#FFFFFF" bg={FIELD_ICON.phone.color} containerSize={40} borderRadius={12} />
                <VStack className="flex-1">
                  <Text style={localStyles.label}>Número de teléfono</Text>
                  <Input style={localStyles.input}>
                    <InputField
                      className="text-sm"
                      style={{ color: C.textPrimary }}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="Número de teléfono"
                      placeholderTextColor={C.gray40}
                      keyboardType="phone-pad"
                    />
                  </Input>
                </VStack>
              </HStack>
            </Box>
          </Box>

          {/* Datos físicos -- segunda tarjeta separada, mismo criterio de
              agrupación que la referencia. */}
          <Text style={[localStyles.sectionLabel, { marginTop: 20 }]}>Datos físicos</Text>
          <Box style={localStyles.card}>
            <Box style={localStyles.row}>
              <HStack space="md" className="items-center">
                <AppIcon name={FIELD_ICON.gender.icon} color="#FFFFFF" bg={FIELD_ICON.gender.color} containerSize={40} borderRadius={12} />
                <VStack className="flex-1">
                  <Text style={localStyles.label}>Sexo</Text>
                  <HStack className="gap-2.5" style={{ marginTop: 4 }}>
                    {genderList.map((g) => (
                      <Button
                        key={g.id}
                        variant="outline"
                        style={[localStyles.genderBtn, selectGender === g.id && localStyles.genderBtnActive] as any}
                        onPress={() => {
                          setSelectGender(g.id);
                          genderRef.current = g.key;
                        }}
                      >
                        <ButtonText style={[localStyles.genderText, selectGender === g.id && localStyles.genderTextActive] as any}>
                          {g.label}
                        </ButtonText>
                      </Button>
                    ))}
                  </HStack>
                </VStack>
              </HStack>
            </Box>

            <Box style={localStyles.row}>
              <HStack space="md" className="items-center">
                <AppIcon name={FIELD_ICON.age.icon} color="#FFFFFF" bg={FIELD_ICON.age.color} containerSize={40} borderRadius={12} />
                <VStack className="flex-1">
                  <Text style={localStyles.label}>Edad</Text>
                  <Input style={localStyles.input}>
                    <InputField
                      className="text-sm"
                      style={{ color: C.textPrimary }}
                      value={age}
                      onChangeText={setAge}
                      placeholder="Edad"
                      placeholderTextColor={C.gray40}
                      keyboardType="number-pad"
                    />
                  </Input>
                </VStack>
              </HStack>
            </Box>

            <Box style={localStyles.row}>
              <HStack space="md" className="items-center">
                <AppIcon name={FIELD_ICON.weight.icon} color="#FFFFFF" bg={FIELD_ICON.weight.color} containerSize={40} borderRadius={12} />
                <VStack className="flex-1">
                  <Text style={localStyles.label}>Peso</Text>
                  <Input style={localStyles.input}>
                    <InputField
                      className="text-sm"
                      style={{ color: C.textPrimary }}
                      value={weight}
                      onChangeText={setWeight}
                      placeholder="Peso"
                      placeholderTextColor={C.gray40}
                      keyboardType="decimal-pad"
                    />
                  </Input>
                  <HStack space="sm" style={{ marginTop: 8 }}>
                    {renderWeightOption('lbs', 0)}
                    {renderWeightOption('kg', 1)}
                  </HStack>
                </VStack>
              </HStack>
            </Box>

            <Box style={[localStyles.row, localStyles.rowLast]}>
              <HStack space="md" className="items-center">
                <AppIcon name={FIELD_ICON.height.icon} color="#FFFFFF" bg={FIELD_ICON.height.color} containerSize={40} borderRadius={12} />
                <VStack className="flex-1">
                  <Text style={localStyles.label}>Altura</Text>
                  <Input style={localStyles.input}>
                    <InputField
                      className="text-sm"
                      style={{ color: C.textPrimary }}
                      value={heightVal}
                      onChangeText={setHeightVal}
                      placeholder="Altura"
                      placeholderTextColor={C.gray40}
                      keyboardType="decimal-pad"
                    />
                  </Input>
                  <HStack space="sm" style={{ marginTop: 8 }}>
                    {renderHeightOption('feet', 0)}
                    {renderHeightOption('cm', 1)}
                  </HStack>
                </VStack>
              </HStack>
            </Box>
          </Box>

          {/* Zona de peligro -- borrado de cuenta. Requisito de tienda
              (Apple 5.1.1v / Google Play), no una mejora de producto: sin
              esto, la app no puede pasar review si permite registro. */}
          <Text style={[localStyles.sectionLabel, { marginTop: 20 }]}>Zona de peligro</Text>
          <Box style={[localStyles.card, localStyles.dangerCard]}>
            <Pressable
              style={[localStyles.row, localStyles.rowLast]}
              onPress={confirmDeleteAccount}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityLabel="Eliminar cuenta"
            >
              <HStack space="md" className="items-center">
                <AppIcon name="trash-outline" color="#FFFFFF" bg={C.destructive} containerSize={40} borderRadius={12} />
                <VStack className="flex-1">
                  <Text weight="semibold" style={{ color: C.destructive }}>Eliminar cuenta</Text>
                  <Text size="xs" muted style={{ marginTop: 2 }}>
                    Borra tu cuenta y todos tus datos de forma permanente.
                  </Text>
                </VStack>
                {isDeleting && <Spinner size="small" color={C.destructive} />}
              </HStack>
            </Pressable>
          </Box>
        </ScrollView>

        {isLoading && (
          <Box style={localStyles.loaderContainer}>
            <Spinner size="large" color={C.orange} />
          </Box>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40 + WORKOUT_MINIBAR_CLEARANCE,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  cameraBtn: {
    position: 'absolute',
    top: 62,
    left: '50%',
    marginLeft: 18,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.orange,
    borderWidth: 2,
    borderColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tarjeta blanca de verdad (antes C.gray80, casi el mismo tono que el
  // fondo de la pantalla -- la tarjeta apenas se distinguía). Mismo look
  // que las tarjetas "General"/"Datos" de la referencia.
  card: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: C.destructive20,
  },
  // Etiqueta gris encima de cada tarjeta (mismo patrón que "General"/"Datos"
  // en la referencia) -- agrupa los campos en 2 tarjetas en vez de una sola
  // lista larga.
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
  // Fondo gris claro (antes C.surface/blanco) -- con la tarjeta ya blanca,
  // un botón inactivo blanco se volvía invisible sobre ella.
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: C.gray10,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: C.orange,
  },
  genderText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: C.textSecondary,
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: C.gray10,
  },
  unitBtnActive: {
    backgroundColor: C.orange,
  },
  unitBtnText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: C.textSecondary,
  },
  unitBtnTextActive: {
    color: '#FFFFFF',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  });
}
