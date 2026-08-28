import React, { useMemo, useState } from 'react';
import {  StyleSheet, Platform, ActivityIndicator, ScrollView  } from 'react-native';
import { showToast } from '@helper/toast';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import {  Text  } from '@components/ui/text';
import {  Pressable  } from '@components/ui/pressable';
import {  HStack  } from '@components/ui/hstack';
import {  Input, InputField  } from '@components/ui/input';
import {  Textarea, TextareaInput  } from '@components/ui/textarea';
import ScreenHeader from '@components/ScreenHeader';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import {  getDiagnosticsReportText  } from '@helper/logger';
import {  appFeedbackApi, AppFeedbackType, AppFeedbackSection  } from '@api/appFeedback';
import { FONT, RADIUS } from './theme';
// Pantalla nueva (pedido explícito): "Solicitar una función" / "Informar de
// un error" dejan de ser un mailto y pasan a ser un formulario real que
// guarda en el backend -- mismo mecanismo que ya usa ScreenReviewFab
// ("Revisar pantalla": guarda en v1/screen-review-mark para poder
// consultarlo después desde el admin panel), aplicado aquí a feedback de
// producto en vez de a la revisión de pantallas migradas.
//
// El endpoint v1/app-feedback todavía no existe en el backend -- ver
// docs/PENDIENTE_BACKEND_ADMIN.md para el contrato completo. Hasta que
// exista, enviar el formulario falla con un Alert normal (mismo patrón que
// cualquier otro formulario de la app cuando el backend responde con
// error), no se simula un envío que en realidad no llega a ningún sitio.
const SECTIONS: { key: AppFeedbackSection; label: string }[] = [
  { key: 'workout', label: 'Entrenamiento' },
  { key: 'nutrition', label: 'Nutrición' },
  { key: 'habits', label: 'Hábitos' },
  { key: 'metrics', label: 'Métricas' },
  { key: 'other', label: 'Otro' },
];

export default function AppFeedbackScreen(props: any) {
  const type: AppFeedbackType = props.route?.params?.type === 'bug_report' ? 'bug_report' : 'feature_request';
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState<AppFeedbackSection | null>(null);
  const [sectionOther, setSectionOther] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isBug = type === 'bug_report';
  const screenTitle = isBug ? 'Informar de un error' : 'Solicitar una función';
  const titlePlaceholder = isBug ? 'p. ej. La sesión de entrenamiento se cierra sola' : 'p. ej. Poder repetir la última comida';
  const descriptionPlaceholder = isBug
    ? 'Qué esperabas que pasara, qué pasó en realidad, y los pasos para reproducirlo si los recuerdas...'
    : 'Qué te gustaría poder hacer y por qué te sería útil...';

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast('Falta el título', { description: 'Ponle un título corto a tu ' + (isBug ? 'informe.' : 'solicitud.'), variant: 'warning' });
      return;
    }
    if (!description.trim()) {
      showToast('Falta la descripción', { description: 'Cuéntanos con más detalle antes de enviarlo.', variant: 'warning' });
      return;
    }
    if (!section) {
      showToast('Falta la sección', { description: 'Indica con qué parte de la app está relacionado.', variant: 'warning' });
      return;
    }
    if (section === 'other' && !sectionOther.trim()) {
      showToast('Falta describir la sección', { description: 'Cuéntanos brevemente con qué parte de la app está relacionado.', variant: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      await appFeedbackApi.submit({
        type,
        title: title.trim(),
        description: description.trim(),
        section,
        section_other: section === 'other' ? sectionOther.trim() : undefined,
        diagnostics_log: getDiagnosticsReportText() ?? undefined,
        app_version: Constants.expoConfig?.version,
        platform: Platform.OS,
      });
      showToast(isBug ? 'Informe enviado' : 'Solicitud enviada', {
        description: 'Gracias -- el equipo lo revisará en breve.',
        variant: 'success',
      });
      props.navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'No se pudo enviar. Inténtalo de nuevo más tarde.';
      showToast('Error', { description: msg, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title={screenTitle} onBack={() => props.navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + WORKOUT_MINIBAR_CLEARANCE }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Título</Text>
        <Input style={styles.inputBox} size="lg">
          <InputField placeholder={titlePlaceholder} value={title} onChangeText={setTitle} maxLength={100} style={{ fontFamily: FONT.regular }} />
        </Input>

        <Text style={[styles.label, { marginTop: 20 }]}>Sección relacionada</Text>
        <HStack style={{ flexWrap: 'wrap' }} space="sm">
          {SECTIONS.map((s) => {
            const active = section === s.key;
            return (
              <Pressable
                key={s.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSection(s.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </HStack>
        {section === 'other' && (
          <Input style={[styles.inputBox, { marginTop: 10 }]} size="lg">
            <InputField
              placeholder="Describe brevemente la sección"
              value={sectionOther}
              onChangeText={setSectionOther}
              maxLength={60}
              style={{ fontFamily: FONT.regular }}
            />
          </Input>
        )}

        <Text style={[styles.label, { marginTop: 20 }]}>Descripción</Text>
        <Textarea style={styles.textareaBox}>
          <TextareaInput
            placeholder={descriptionPlaceholder}
            value={description}
            onChangeText={setDescription}
            style={{ fontFamily: FONT.regular, fontSize: 14 }}
            multiline
          />
        </Textarea>

        <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>{isBug ? 'Enviar informe' : 'Enviar solicitud'}</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    label: { fontSize: 13, fontFamily: FONT.bold, color: C.textPrimary, marginBottom: 8 },
    inputBox: { backgroundColor: C.surface, borderRadius: RADIUS.sm, borderWidth: 0 },
    textareaBox: { backgroundColor: C.surface, borderRadius: RADIUS.sm, borderWidth: 0, minHeight: 120, paddingHorizontal: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.lg, backgroundColor: C.surface, marginBottom: 8 },
    chipActive: { backgroundColor: C.textPrimary },
    chipText: { fontSize: 13, fontFamily: FONT.semiBold, color: C.textSecondary },
    chipTextActive: { color: C.bg },
    submitBtn: {
      backgroundColor: C.primary,
      borderRadius: RADIUS.md,
      paddingVertical: 15,
      alignItems: 'center' as const,
      marginTop: 28,
    },
    submitBtnText: { fontSize: 15, fontFamily: FONT.bold, color: '#FFFFFF' },
  });
}
