import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@store/AuthContext";
import { authApi } from "@api/auth";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

const GENEROS = ["Masculino", "Femenino", "Otro", "Prefiero no decir"];

const GENDER_KEY_MAP: Record<string, string> = {
  Masculino: "male",
  Femenino: "female",
  Otro: "other",
  "Prefiero no decir": "not_specified",
};

export default function ProfileSetupFormScreen({ navigation }: any) {
  const { state, updateUser } = useAuth();
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [genero, setGenero] = useState("");
  const [showGenero, setShowGenero] = useState(false);
  // fechaNac/nacionalidad/alergias/medicacion/suplementos/notas: sin columna real
  // en `users`/`user_profiles` (verificado en el schema del VPS) — se piden en la
  // UI pero hoy no hay dónde persistirlos sin añadir migraciones nuevas, decisión
  // de producto/legal (son datos de salud sensibles) que no corresponde tomar aquí.
  const [fechaNac, setFechaNac] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [nacionalidad, setNacionalidad] = useState("");
  const [alergias, setAlergias] = useState<string[]>([]);
  const [alergiaInput, setAlergiaInput] = useState("");
  const [medicacion, setMedicacion] = useState("");
  const [suplementos, setSuplementos] = useState("");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const addAlergia = () => {
    if (alergiaInput.trim()) {
      setAlergias([...alergias, alergiaInput.trim()]);
      setAlergiaInput("");
    }
  };

  const removeAlergia = (index: number) => {
    setAlergias(alergias.filter((_, i) => i !== index));
  };

  const generos = GENEROS;
  const genderKeyMap = GENDER_KEY_MAP;

  const handleContinue = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        // update-profile exige username Y email siempre (UserRequest::rules()),
        // aunque esta pantalla no los pida — sin ambos, el guardado falla 422
        // aunque el resto del payload sea válido (mismo patrón de bug ya
        // documentado en edit_profile_screen.tsx, pero con un campo obligatorio
        // más que no estaba cubierto ahí).
        username: state.user?.username,
        email: state.user?.email,
      };
      if (nombre.trim()) payload.first_name = nombre.trim();
      if (apellidos.trim()) payload.last_name = apellidos.trim();
      if (telefono.trim()) payload.phone_number = telefono.trim();
      if (genero) payload.gender = genderKeyMap[genero] ?? genero;
      const userProfile: Record<string, any> = {};
      if (direccion.trim()) userProfile.address = direccion.trim();
      if (altura.trim()) userProfile.height = altura.trim();
      if (peso.trim()) userProfile.weight = peso.trim();
      if (Object.keys(userProfile).length > 0) payload.user_profile = userProfile;

      const response = await authApi.updateProfile(payload);
      if (state.user && response.data?.data) {
        updateUser({ ...state.user, ...response.data.data });
      }
      navigation.navigate("MigratedAvatarSetup");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo guardar tu información. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent}>
        <Text style={[localStyles.title, { color: C.textPrimary }]}>Tu informaciÃ³n</Text>

        <Text style={[localStyles.sectionLabel, { color: C.textPrimary }]}>Datos personales</Text>
        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>Nombre</Text>
          <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white }]} value={nombre} onChangeText={setNombre} placeholder="Tu nombre" placeholderTextColor={C.textMuted} />
        </View>
        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>Apellidos</Text>
          <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white }]} value={apellidos} onChangeText={setApellidos} placeholder="Tus apellidos" placeholderTextColor={C.textMuted} />
        </View>

        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>GÃ©nero</Text>
          <Pressable
            style={({ pressed }) => [
              localStyles.input,
              localStyles.pickerInput,
              { borderColor: C.border },
              pressed && { opacity: 0.2 },
            ]}
            onPress={() => setShowGenero(!showGenero)}
          >
            <Text style={{ color: genero ? C.white : C.textMuted }}>{genero || "Seleccionar gÃ©nero"}</Text>
            <Ionicons name={showGenero ? "chevron-up" : "chevron-down"} size={18} color={C.gray} />
          </Pressable>
          {showGenero && (
            <View style={localStyles.dropdown}>
              {generos.map((g) => (
                <Pressable
                  key={g}
                  style={({ pressed }) => [
                    localStyles.dropdownItem,
                    { borderBottomColor: C.border },
                    pressed && { opacity: 0.2 },
                  ]}
                  onPress={() => { setGenero(g); setShowGenero(false); }}
                >
                  <Text style={[localStyles.dropdownText, { color: C.white }]}>{g}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>Fecha de nacimiento</Text>
          <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white }]} value={fechaNac} onChangeText={setFechaNac} placeholder="DD/MM/AAAA" placeholderTextColor={C.textMuted} keyboardType="numeric" />
        </View>
        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>TelÃ©fono</Text>
          <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white }]} value={telefono} onChangeText={setTelefono} placeholder="+34 000 000 000" placeholderTextColor={C.textMuted} keyboardType="phone-pad" />
        </View>
        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>DirecciÃ³n</Text>
          <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white }]} value={direccion} onChangeText={setDireccion} placeholder="Tu direcciÃ³n" placeholderTextColor={C.textMuted} />
        </View>
        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>Nacionalidad</Text>
          <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white }]} value={nacionalidad} onChangeText={setNacionalidad} placeholder="Tu nacionalidad" placeholderTextColor={C.textMuted} />
        </View>

        <Text style={[localStyles.sectionLabel, { color: C.textPrimary, marginTop: 16 }]}>Salud</Text>
        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>Alergias</Text>
          <View style={localStyles.tagInputRow}>
            <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white, flex: 1 }]} value={alergiaInput} onChangeText={setAlergiaInput} placeholder="Agregar alergia" placeholderTextColor={C.textMuted} onSubmitEditing={addAlergia} />
            <Pressable
              style={({ pressed }) => [
                localStyles.addTagBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.2 },
              ]}
              onPress={addAlergia}
            >
              <Ionicons name="add" size={20} color={C.white} />
            </Pressable>
          </View>
          <View style={localStyles.tagsContainer}>
            {alergias.map((a, idx) => (
              <View key={idx} style={[localStyles.tag, { backgroundColor: C.primary + "15" }]}>
                <Text style={[localStyles.tagText, { color: C.textPrimary }]}>{a}</Text>
                <Pressable onPress={() => removeAlergia(idx)} style={({ pressed }) => pressed && { opacity: 0.2 }}>
                  <Ionicons name="close-circle" size={16} color={C.textPrimary} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>MedicaciÃ³n</Text>
          <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white }]} value={medicacion} onChangeText={setMedicacion} placeholder="MedicaciÃ³n actual" placeholderTextColor={C.textMuted} />
        </View>
        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>Suplementos</Text>
          <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white }]} value={suplementos} onChangeText={setSuplementos} placeholder="Suplementos que tomas" placeholderTextColor={C.textMuted} />
        </View>

        <Text style={[localStyles.sectionLabel, { color: C.textPrimary, marginTop: 16 }]}>Cuerpo</Text>
        <View style={localStyles.row}>
          <View style={[localStyles.field, { flex: 1 }]}>
            <Text style={[localStyles.label, { color: C.white }]}>Altura (cm)</Text>
            <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white }]} value={altura} onChangeText={setAltura} placeholder="175" placeholderTextColor={C.textMuted} keyboardType="numeric" />
          </View>
          <View style={{ width: 12 }} />
          <View style={[localStyles.field, { flex: 1 }]}>
            <Text style={[localStyles.label, { color: C.white }]}>Peso (kg)</Text>
            <TextInput style={[localStyles.input, { borderColor: C.border, color: C.white }]} value={peso} onChangeText={setPeso} placeholder="70" placeholderTextColor={C.textMuted} keyboardType="numeric" />
          </View>
        </View>

        <View style={localStyles.field}>
          <Text style={[localStyles.label, { color: C.white }]}>Notas adicionales</Text>
          <TextInput style={[localStyles.input, localStyles.textArea, { borderColor: C.border, color: C.white }]} value={notas} onChangeText={setNotas} placeholder="Lesiones, condiciones mÃ©dicas, etc." placeholderTextColor={C.textMuted} multiline numberOfLines={4} textAlignVertical="top" />
        </View>
      </ScrollView>

      <View style={localStyles.bottomBar}>
        <Pressable
          style={({ pressed }) => [
            localStyles.continueBtn,
            { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 },
            pressed && { opacity: 0.2 },
          ]}
          onPress={handleContinue}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={[localStyles.continueBtnText, { color: C.white }]}>Continuar</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scrollContent: { padding: 20, paddingBottom: 100 },
    title: { fontSize: 24, lineHeight: 29, fontFamily: FONT.bold, marginBottom: 20, textAlign: "center" },
    sectionLabel: { fontSize: 14, fontFamily: FONT.bold, marginBottom: 12 },
    field: { marginBottom: 14 },
    label: { fontSize: 13, fontFamily: FONT.semiBold, marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, backgroundColor: C.surface },
    pickerInput: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    dropdown: { backgroundColor: C.surface, borderRadius: 10, marginTop: 4, overflow: "hidden" },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
    dropdownText: { fontSize: 14 },
    row: { flexDirection: "row" },
    tagInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    addTagBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
    tagText: { fontSize: 13, fontFamily: FONT.medium },
    textArea: { height: 100, paddingTop: 12 },
    bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: C.surface },
    continueBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },
    continueBtnText: { fontSize: 16, fontFamily: FONT.bold },
  });
}
