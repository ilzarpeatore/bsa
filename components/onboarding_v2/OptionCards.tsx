import React from 'react';
import {  View, Text, Pressable, StyleSheet  } from 'react-native';
import {  Ionicons  } from '@expo/vector-icons';
import {  OnboardingOption  } from '../../types/onboardingV2';
import { C, FONT, RADIUS } from '../../pages/migrated/theme';
interface Props {
  options: OnboardingOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}

// Tarjetas de selección única, apiladas a ancho completo -- mismo patrón
// tanto para preguntas PAR-Q (2 opciones Sí/No) como para preguntas con
// icono+subtítulo (tipo de dieta, estilo de vida), según las capturas de
// referencia del usuario (fondo naranja claro + círculo de check sólido en
// la seleccionada, círculo hueco en el resto -- adaptado de su amarillo
// original al naranja de marca de la app).
export default function OptionCards({ options, value, onChange }: Props) {
  return (
    <View style={styles.list}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.card, selected && styles.cardSelected]}
          >
            {option.icon ? (
              option.emoji ? (
                <Text style={styles.emoji}>{option.icon}</Text>
              ) : (
                <Ionicons name={option.icon as any} size={22} color={C.textPrimary} style={styles.icon} />
              )
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{option.label}</Text>
              {option.subtitle ? <Text style={styles.subtitle}>{option.subtitle}</Text> : null}
            </View>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  cardSelected: { backgroundColor: `${C.orange}26` },
  icon: { marginRight: 2 },
  emoji: { fontSize: 24, marginRight: 2 },
  label: { fontSize: 15.5, fontFamily: FONT.bold, color: C.textPrimary },
  subtitle: { fontSize: 13, fontFamily: FONT.regular, color: C.textSecondary, marginTop: 2 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: C.orange, borderColor: C.orange },
});
