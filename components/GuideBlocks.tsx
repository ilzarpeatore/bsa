import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@components/ui/text';
import { Icon } from '@components/ui/icon';
import { useAppColorMode } from '@helper/useAppColorMode';
import { FONT, RADIUS } from '../pages/migrated/theme';

// Bloques compartidos por las guías estáticas de contenido (Guía de
// Autogestión, Guía de Sobrentrenamiento...) -- extraído tras la 2ª guía
// real (pedido explícito 2026-08-30) para no duplicar el mismo lenguaje
// visual (secciones, tablas, cajas de aviso) en cada archivo. Cada guía
// sigue siendo un único componente de pantalla con su propio contenido; lo
// que se comparte es solo la "gramática" de bloques con la que se escribe.
export type CellPart = { text: string; bold?: boolean; color?: string };
export type Cell = string | CellPart[];

export function createGuideStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    headerBlock: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 20,
      alignItems: 'center',
    },
    headerIcon: { fontSize: 40, marginBottom: 10 },
    title: {
      fontFamily: FONT.extraBold,
      fontSize: 26,
      color: C.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    titleAccent: { color: C.orange60 },
    brandKicker: { fontFamily: FONT.extraBold, fontSize: 15, color: C.textSecondary, marginBottom: 10 },
    subtitle: {
      fontFamily: FONT.bold,
      fontSize: 12,
      color: C.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 14,
    },
    description: {
      fontFamily: FONT.medium,
      fontSize: 14.5,
      lineHeight: 21,
      color: C.textSecondary,
      textAlign: 'center',
      maxWidth: 340,
    },
    section: { paddingHorizontal: 20, marginTop: 28 },
    sectionKicker: {
      fontFamily: FONT.bold,
      fontSize: 11,
      color: C.orange60,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 6,
    },
    sectionTitle: {
      fontFamily: FONT.extraBold,
      fontSize: 20,
      color: C.textPrimary,
      marginBottom: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.orange10,
    },
    subHeading: {
      fontFamily: FONT.bold,
      fontSize: 15,
      color: C.textPrimary,
      marginTop: 18,
      marginBottom: 10,
    },
    paragraph: {
      fontFamily: FONT.regular,
      fontSize: 14.5,
      lineHeight: 22,
      color: C.textSecondary,
      marginBottom: 14,
    },
    inlineBold: { fontFamily: FONT.bold, color: C.textPrimary },
    bulletRow: { flexDirection: 'row', marginBottom: 14, paddingRight: 4 },
    bulletArrow: { fontFamily: FONT.bold, fontSize: 14.5, color: C.orange60, marginRight: 8 },
    bulletTextWrap: { flex: 1 },
    bulletTitle: { fontFamily: FONT.bold, fontSize: 14.5, lineHeight: 21, color: C.textPrimary },
    bulletText: { fontFamily: FONT.regular, fontSize: 14.5, lineHeight: 22, color: C.textSecondary },
    bulletSubText: { fontFamily: FONT.regular, fontSize: 13, lineHeight: 19, color: C.textSecondary, marginTop: 4 },
    highlightBox: {
      backgroundColor: C.orange10,
      borderLeftWidth: 4,
      borderLeftColor: C.orange,
      borderRadius: RADIUS.sm,
      padding: 16,
      marginTop: 8,
      marginBottom: 14,
    },
    highlightBoxInfo: { backgroundColor: C.blue10, borderLeftColor: C.blue },
    highlightBoxSuccess: { backgroundColor: C.success10, borderLeftColor: C.success },
    highlightBoxWarning: { backgroundColor: C.warning10, borderLeftColor: C.warning },
    highlightBoxDanger: { backgroundColor: C.destructive10, borderLeftColor: C.destructive },
    highlightTitle: { fontFamily: FONT.bold, fontSize: 13, color: C.orange60, marginBottom: 8 },
    highlightTitleInfo: { color: C.blue60 },
    highlightTitleSuccess: { color: C.success60 },
    highlightTitleWarning: { color: C.warning60 },
    highlightTitleDanger: { color: C.destructive },
    highlightText: { fontFamily: FONT.regular, fontSize: 13.5, lineHeight: 20, color: C.textPrimary },
    exampleBox: {
      backgroundColor: C.blue5,
      borderWidth: 1,
      borderColor: C.blue20,
      borderRadius: RADIUS.sm,
      padding: 14,
      marginTop: 8,
      marginBottom: 14,
    },
    exampleTitle: { fontFamily: FONT.bold, fontSize: 13, color: C.blue60, marginBottom: 6 },
    exampleText: { fontFamily: FONT.regular, fontSize: 13.5, lineHeight: 20, color: C.textPrimary },
    columnBlock: { marginBottom: 16 },
    columnBlockTitle: { fontFamily: FONT.bold, fontSize: 14.5, color: C.textPrimary, marginBottom: 6 },
    columnBlockText: { fontFamily: FONT.regular, fontSize: 13, lineHeight: 19, color: C.textSecondary },
    trafficLightWrap: {
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.md,
      padding: 18,
      marginTop: 12,
      marginBottom: 14,
    },
    trafficLightHeading: {
      fontFamily: FONT.bold,
      fontSize: 15,
      color: C.textPrimary,
      textAlign: 'center',
      marginBottom: 16,
    },
    trafficLightItem: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      borderRadius: RADIUS.sm,
      marginBottom: 12,
    },
    trafficLightItemGreen: { backgroundColor: C.success10, borderLeftWidth: 4, borderLeftColor: C.success },
    trafficLightItemYellow: { backgroundColor: C.warning10, borderLeftWidth: 4, borderLeftColor: C.warning },
    trafficLightItemRed: { backgroundColor: C.destructive10, borderLeftWidth: 4, borderLeftColor: C.destructive },
    trafficLightIcon: { fontSize: 26 },
    trafficLightTitle: { fontFamily: FONT.bold, fontSize: 14.5, color: C.textPrimary, marginBottom: 4 },
    trafficLightText: { fontFamily: FONT.medium, fontSize: 12.5, lineHeight: 18, color: C.textPrimary },
    trafficLightSubText: { fontFamily: FONT.regular, fontSize: 12.5, lineHeight: 18, color: C.textSecondary, marginTop: 6 },
    tableScroll: { marginBottom: 16 },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: C.blue60,
      borderTopLeftRadius: RADIUS.sm,
      borderTopRightRadius: RADIUS.sm,
      overflow: 'hidden',
    },
    tableHeaderCell: { paddingVertical: 12, paddingHorizontal: 12 },
    tableHeaderText: {
      fontFamily: FONT.bold,
      fontSize: 11.5,
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.surface,
    },
    tableRowLast: { borderBottomLeftRadius: RADIUS.sm, borderBottomRightRadius: RADIUS.sm, overflow: 'hidden' },
    tableCell: { paddingVertical: 12, paddingHorizontal: 12 },
    tableCellText: { fontFamily: FONT.regular, fontSize: 12.5, lineHeight: 18, color: C.textSecondary },
    tableCellTextBold: { fontFamily: FONT.bold, color: C.textPrimary },
    tierBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.xs,
      borderWidth: 1,
    },
    tierBadge1: { backgroundColor: C.success10, borderColor: C.success },
    tierBadge2: { backgroundColor: C.warning10, borderColor: C.warning },
    tierBadge3: { backgroundColor: C.destructive10, borderColor: C.destructive },
    tierBadgeText: { fontFamily: FONT.bold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 },
    tierBadgeText1: { color: C.success60 },
    tierBadgeText2: { color: C.warning60 },
    tierBadgeText3: { color: C.destructive },
    supplementCard: {
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.md,
      padding: 18,
      marginBottom: 18,
    },
    supplementName: { fontFamily: FONT.bold, fontSize: 17, color: C.textPrimary, marginBottom: 4, flex: 1, paddingRight: 8 },
    supplementNameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
    kvRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    kvRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
    kvLabel: { fontFamily: FONT.bold, fontSize: 12.5, color: C.orange60, marginBottom: 3 },
    kvValue: { fontFamily: FONT.regular, fontSize: 13, lineHeight: 19, color: C.textSecondary },
    stackCard: {
      backgroundColor: C.orange10,
      borderWidth: 1,
      borderColor: 'rgba(73,197,182,0.3)',
      borderRadius: RADIUS.md,
      padding: 18,
      marginBottom: 18,
    },
    stackName: { fontFamily: FONT.bold, fontSize: 17, color: C.orange60, marginBottom: 6 },
    stackLabel: {
      fontFamily: FONT.bold,
      fontSize: 11,
      color: C.orange60,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 14,
      marginBottom: 8,
    },
    tocBox: {
      marginHorizontal: 20,
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.md,
      padding: 20,
      marginBottom: 8,
    },
    tocTitle: {
      fontFamily: FONT.bold,
      fontSize: 13,
      color: C.orange60,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 14,
    },
    tocLink: {
      fontFamily: FONT.medium,
      fontSize: 14,
      color: C.textPrimary,
      paddingVertical: 8,
    },
    tocLinkDisabled: {
      fontFamily: FONT.medium,
      fontSize: 14,
      color: C.textTertiary,
      paddingVertical: 8,
    },
    tocItem: { marginBottom: 4 },
    tocItemDescription: {
      fontFamily: FONT.regular,
      fontSize: 12.5,
      color: C.textSecondary,
      marginTop: -4,
      marginBottom: 8,
    },
    guideCard: {
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.md,
      padding: 18,
      marginBottom: 14,
    },
    guideCardIcon: { fontSize: 30, marginBottom: 10 },
    guideCardTitle: { fontFamily: FONT.bold, fontSize: 15.5, color: C.orange60, marginBottom: 8 },
    guideCardText: { fontFamily: FONT.regular, fontSize: 13.5, lineHeight: 20, color: C.textSecondary },
    checklistBox: {
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.md,
      padding: 14,
      marginTop: 8,
      marginBottom: 14,
    },
    checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: C.bg,
      borderRadius: RADIUS.sm,
      padding: 14,
      marginBottom: 10,
    },
    checklistBoxIcon: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: C.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checklistBoxIconChecked: { backgroundColor: C.orange },
    checklistItemText: { flex: 1, fontFamily: FONT.medium, fontSize: 13.5, lineHeight: 19, color: C.textPrimary },
    checklistItemTextChecked: { color: C.orange60, textDecorationLine: 'line-through' },
    selectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.sm,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    selectRowSelected: { backgroundColor: C.orange10, borderColor: C.orange },
    selectRowText: { flex: 1, fontFamily: FONT.medium, fontSize: 13.5, color: C.textPrimary, paddingRight: 8 },
    selectRowTextSelected: { fontFamily: FONT.bold, color: C.orange60 },
    selectRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectRadioSelected: { backgroundColor: C.orange, borderColor: C.orange },
    calculatorBox: {
      backgroundColor: C.orange10,
      borderWidth: 1,
      borderColor: 'rgba(73,197,182,0.3)',
      borderRadius: RADIUS.md,
      padding: 18,
      marginTop: 8,
    },
    calculatorTitle: { fontFamily: FONT.bold, fontSize: 15, color: C.orange60, marginBottom: 16 },
    calcInputLabel: { fontFamily: FONT.medium, fontSize: 13, color: C.textPrimary, marginBottom: 8 },
    calcInput: { backgroundColor: C.surface, marginBottom: 4 },
    calcResultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    calcResultBox: {
      width: '47%',
      backgroundColor: C.success10,
      borderLeftWidth: 3,
      borderLeftColor: C.success,
      borderRadius: RADIUS.sm,
      padding: 12,
    },
    calcResultLabel: { fontFamily: FONT.bold, fontSize: 10.5, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
    calcResultValue: { fontFamily: FONT.extraBold, fontSize: 19, color: C.success60, marginTop: 4 },
    calcResultNote: { fontFamily: FONT.regular, fontSize: 11, color: C.textSecondary, marginTop: 3 },
    footerBox: {
      marginHorizontal: 20,
      marginTop: 8,
      backgroundColor: C.orange10,
      borderWidth: 1,
      // No existe un token orange20 (ver theme.ts) -- rgba directa del
      // mismo teal de marca (#49C5B6) a baja opacidad, mismo patrón que
      // exampleBox usa con C.blue20.
      borderColor: 'rgba(73,197,182,0.3)',
      borderRadius: RADIUS.md,
      padding: 20,
      alignItems: 'center',
    },
    footerTitle: {
      fontFamily: FONT.extraBold,
      fontSize: 15,
      color: C.orange60,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    footerText: {
      fontFamily: FONT.regular,
      fontSize: 14,
      lineHeight: 21,
      color: C.textPrimary,
      textAlign: 'center',
      marginBottom: 10,
    },
    footerSignature: {
      fontFamily: FONT.extraBold,
      fontSize: 17,
      color: C.orange60,
      marginTop: 10,
    },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
    statCard: {
      flexGrow: 1,
      minWidth: '30%',
      backgroundColor: C.orange10,
      borderWidth: 1,
      borderColor: 'rgba(73,197,182,0.3)',
      borderRadius: RADIUS.md,
      padding: 14,
      alignItems: 'center',
    },
    statNumber: { fontFamily: FONT.extraBold, fontSize: 24, color: C.orange60 },
    statText: { fontFamily: FONT.regular, fontSize: 11, color: C.textSecondary, textAlign: 'center', marginTop: 6 },
    noteCard: {
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.md,
      padding: 16,
      marginBottom: 14,
    },
    noteCardSuccess: { backgroundColor: C.success10, borderColor: C.success },
    noteCardWarning: { backgroundColor: C.warning10, borderColor: C.warning },
    noteCardDanger: { backgroundColor: C.destructive10, borderColor: C.destructive },
    noteCardTitle: { fontFamily: FONT.bold, fontSize: 13.5, color: C.textPrimary, marginBottom: 6 },
    noteCardText: { fontFamily: FONT.regular, fontSize: 13.5, lineHeight: 20, color: C.textSecondary },
    accordionItem: {
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.md,
      marginBottom: 12,
      overflow: 'hidden',
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: C.orange10,
    },
    accordionHeaderText: { flex: 1, fontFamily: FONT.bold, fontSize: 14, color: C.orange60, paddingRight: 10 },
    accordionContent: { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
    checklistCategoryTitle: {
      fontFamily: FONT.bold,
      fontSize: 13.5,
      color: C.orange60,
      marginTop: 16,
      marginBottom: 10,
    },
    actionItem: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    actionNumber: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: C.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionNumberText: { fontFamily: FONT.extraBold, fontSize: 14, color: '#12312C' },
    actionTitle: { fontFamily: FONT.bold, fontSize: 14.5, color: C.textPrimary, marginBottom: 3 },
    actionText: { flex: 1, fontFamily: FONT.regular, fontSize: 13.5, lineHeight: 20, color: C.textSecondary },
  });
}

export type GuideStyles = ReturnType<typeof createGuideStyles>;

export function Section({
  styles,
  title,
  kicker,
  children,
}: {
  styles: GuideStyles;
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {kicker ? <Text style={styles.sectionKicker}>{kicker}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function SubHeading({ styles, children }: { styles: GuideStyles; children: React.ReactNode }) {
  return <Text style={styles.subHeading}>{children}</Text>;
}

export function P({ styles, children, last }: { styles: GuideStyles; children: React.ReactNode; last?: boolean }) {
  return <Text style={[styles.paragraph, last && { marginBottom: 0 }]}>{children}</Text>;
}

export function Bullet({
  styles,
  glyph = '→',
  title,
  children,
  last,
}: {
  styles: GuideStyles;
  glyph?: string;
  title?: string;
  children?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.bulletRow, last && { marginBottom: 0 }]}>
      <Text style={styles.bulletArrow}>{glyph}</Text>
      <View style={styles.bulletTextWrap}>
        {title ? <Text style={styles.bulletTitle}>{title}</Text> : null}
        {children ? <Text style={title ? styles.bulletSubText : styles.bulletText}>{children}</Text> : null}
      </View>
    </View>
  );
}

export function HighlightBox({
  styles,
  title,
  children,
  variant = 'brand',
}: {
  styles: GuideStyles;
  title: string;
  children: React.ReactNode;
  variant?: 'brand' | 'info' | 'success' | 'warning' | 'danger';
}) {
  return (
    <View
      style={[
        styles.highlightBox,
        variant === 'info' && styles.highlightBoxInfo,
        variant === 'success' && styles.highlightBoxSuccess,
        variant === 'warning' && styles.highlightBoxWarning,
        variant === 'danger' && styles.highlightBoxDanger,
      ]}
    >
      <Text
        style={[
          styles.highlightTitle,
          variant === 'info' && styles.highlightTitleInfo,
          variant === 'success' && styles.highlightTitleSuccess,
          variant === 'warning' && styles.highlightTitleWarning,
          variant === 'danger' && styles.highlightTitleDanger,
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export function ExampleBox({ styles, title, children }: { styles: GuideStyles; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.exampleBox}>
      <Text style={styles.exampleTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function ColumnBlock({ styles, title, children }: { styles: GuideStyles; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.columnBlock}>
      <Text style={styles.columnBlockTitle}>{title}</Text>
      <Text style={styles.columnBlockText}>{children}</Text>
    </View>
  );
}

export function TocItem({
  styles,
  label,
  description,
  onPress,
}: {
  styles: GuideStyles;
  label: string;
  description?: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.tocItem}>
      <Text style={onPress ? styles.tocLink : styles.tocLinkDisabled}>{label}</Text>
      {description ? <Text style={styles.tocItemDescription}>{description}</Text> : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

export function GuideCard({ styles, icon, title, children }: { styles: GuideStyles; icon: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.guideCard}>
      <Text style={styles.guideCardIcon}>{icon}</Text>
      <Text style={styles.guideCardTitle}>{title}</Text>
      <Text style={styles.guideCardText}>{children}</Text>
    </View>
  );
}

export function ChecklistItem({
  styles,
  checked,
  onToggle,
  children,
}: {
  styles: GuideStyles;
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable style={styles.checklistItem} onPress={onToggle}>
      <View style={[styles.checklistBoxIcon, checked && styles.checklistBoxIconChecked]}>
        {checked ? <Icon name="checkmark" size={15} color="#12312C" /> : null}
      </View>
      <Text style={[styles.checklistItemText, checked && styles.checklistItemTextChecked]}>{children}</Text>
    </Pressable>
  );
}

export function SelectRow({
  styles,
  label,
  selected,
  onPress,
}: {
  styles: GuideStyles;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.selectRow, selected && styles.selectRowSelected]} onPress={onPress}>
      <Text style={[styles.selectRowText, selected && styles.selectRowTextSelected]}>{label}</Text>
      <View style={[styles.selectRadio, selected && styles.selectRadioSelected]}>
        {selected ? <Icon name="checkmark" size={12} color="#12312C" /> : null}
      </View>
    </Pressable>
  );
}

export function TrafficLight({ styles, heading, children }: { styles: GuideStyles; heading: string; children: React.ReactNode }) {
  return (
    <View style={styles.trafficLightWrap}>
      <Text style={styles.trafficLightHeading}>{heading}</Text>
      {children}
    </View>
  );
}

export function TrafficLightItem({
  styles,
  color,
  icon,
  title,
  status,
  children,
}: {
  styles: GuideStyles;
  color: 'green' | 'yellow' | 'red';
  icon: string;
  title: string;
  status: string;
  children: React.ReactNode;
}) {
  const variantStyle =
    color === 'green' ? styles.trafficLightItemGreen : color === 'yellow' ? styles.trafficLightItemYellow : styles.trafficLightItemRed;
  return (
    <View style={[styles.trafficLightItem, variantStyle]}>
      <Text style={styles.trafficLightIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.trafficLightTitle}>{title}</Text>
        <Text style={styles.trafficLightText}>{status}</Text>
        <Text style={styles.trafficLightSubText}>{children}</Text>
      </View>
    </View>
  );
}

export function StatCard({ styles, number, children }: { styles: GuideStyles; number: string; children: React.ReactNode }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statText}>{children}</Text>
    </View>
  );
}

export function NoteCard({
  styles,
  title,
  children,
  variant = 'default',
}: {
  styles: GuideStyles;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  return (
    <View
      style={[
        styles.noteCard,
        variant === 'success' && styles.noteCardSuccess,
        variant === 'warning' && styles.noteCardWarning,
        variant === 'danger' && styles.noteCardDanger,
      ]}
    >
      <Text style={styles.noteCardTitle}>{title}</Text>
      <Text style={styles.noteCardText}>{children}</Text>
    </View>
  );
}

export function AccordionItem({
  styles,
  accentColor,
  title,
  open,
  onToggle,
  children,
}: {
  styles: GuideStyles;
  /** C.orange60 del llamador -- no se puede leer de `styles` porque
   * StyleSheet.create() no garantiza devolver el objeto plano en producción
   * (puede ser un id opaco), así que el color real hace falta aparte para
   * usarlo en la prop `color` del Icon (no en un `style`). */
  accentColor: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.accordionItem}>
      <Pressable style={styles.accordionHeader} onPress={onToggle}>
        <Text style={styles.accordionHeaderText}>{title}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={accentColor} />
      </Pressable>
      {open ? <View style={styles.accordionContent}>{children}</View> : null}
    </View>
  );
}

export function ActionItem({ styles, number, title, children }: { styles: GuideStyles; number: number; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.actionItem}>
      <View style={styles.actionNumber}>
        <Text style={styles.actionNumberText}>{number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText}>{children}</Text>
      </View>
    </View>
  );
}

export function renderCell(cell: Cell, styles: GuideStyles) {
  if (typeof cell === 'string') {
    return <Text style={styles.tableCellText}>{cell}</Text>;
  }
  return (
    <Text style={styles.tableCellText}>
      {cell.map((part, i) => (
        <Text key={i} style={[part.bold ? styles.tableCellTextBold : undefined, part.color ? { color: part.color } : undefined]}>
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

export function TierBadge({ styles, tier }: { styles: GuideStyles; tier: 1 | 2 | 3 }) {
  const boxStyle = tier === 1 ? styles.tierBadge1 : tier === 2 ? styles.tierBadge2 : styles.tierBadge3;
  const textStyle = tier === 1 ? styles.tierBadgeText1 : tier === 2 ? styles.tierBadgeText2 : styles.tierBadgeText3;
  return (
    <View style={[styles.tierBadge, boxStyle]}>
      <Text style={[styles.tierBadgeText, textStyle]}>Tier {tier}</Text>
    </View>
  );
}

export function KeyValueRow({ styles, label, value, last }: { styles: GuideStyles; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.kvRow, last && styles.kvRowLast]}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

export function SupplementCard({
  styles,
  name,
  tier,
  rows,
  children,
}: {
  styles: GuideStyles;
  name: string;
  tier: 1 | 2 | 3;
  rows: { label: string; value: string }[];
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.supplementCard}>
      <View style={styles.supplementNameRow}>
        <Text style={styles.supplementName}>{name}</Text>
        <TierBadge styles={styles} tier={tier} />
      </View>
      {rows.map((r, i) => (
        <KeyValueRow key={i} styles={styles} label={r.label} value={r.value} last={i === rows.length - 1 && !children} />
      ))}
      {children}
    </View>
  );
}

export function DataTable({
  styles,
  columns,
  widths,
  rows,
}: {
  styles: GuideStyles;
  columns: string[];
  widths: number[];
  rows: Cell[][];
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
      <View>
        <View style={styles.tableHeaderRow}>
          {columns.map((c, i) => (
            <View key={i} style={[styles.tableHeaderCell, { width: widths[i] }]}>
              <Text style={styles.tableHeaderText}>{c}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={[styles.tableRow, ri === rows.length - 1 && styles.tableRowLast]}>
            {row.map((cell, ci) => (
              <View key={ci} style={[styles.tableCell, { width: widths[ci] }]}>
                {renderCell(cell, styles)}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
