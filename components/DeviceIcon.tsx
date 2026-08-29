import React from 'react';
import { View } from 'react-native';
import { SymbolView, SFSymbol, AndroidSymbol } from 'expo-symbols';

interface DeviceIconProps {
  ios: SFSymbol;
  android: AndroidSymbol;
  size?: number;
  color?: string;
}

// Iconos REALES del sistema operativo (pedido explícito 2026-08-29, primer
// uso en pages/migrated/edit_profile_screen.tsx) -- SF Symbols en iOS,
// Material Symbols en Android, ambos vía el mismo SymbolView nativo de
// expo-symbols (no un font de iconos empaquetado como Ionicons/MaterialIcons
// de @expo/vector-icons, que es lo que usa el resto de la app hoy vía
// AppIcon.tsx/components/ui/icon).
//
// Deliberadamente NO sustituye a AppIcon -- unificar el sistema de iconos de
// toda la app es una tarea aparte, todavía pendiente (~85 usos de AppIcon/
// Ionicons ya existentes, ver auditoría UI/UX). Este componente es el punto
// de partida para esa migración futura, empezando por una sola pantalla en
// vez de un cambio global sin poder verlo renderizado.
//
// `ios`/`android` van tipados contra los catálogos reales que ya trae
// expo-symbols (SFSymbol de sf-symbols-typescript, AndroidSymbol generado
// desde fonts.google.com/icons) -- TypeScript ya rechaza cualquier nombre
// que no exista de verdad en cualquiera de los dos sistemas, no hace falta
// confiar de memoria en que un glifo concreto exista.
export default function DeviceIcon({ ios, android, size = 20, color = '#FFFFFF' }: DeviceIconProps) {
  return (
    <SymbolView
      name={{ ios, android }}
      style={{ width: size, height: size }}
      size={size}
      tintColor={color}
    />
  );
}

interface DeviceIconBadgeProps extends DeviceIconProps {
  bg: string;
  containerSize?: number;
  borderRadius?: number;
}

// Badge cuadrado redondeado + DeviceIcon centrado -- mismo look que ya daba
// AppIcon (containerSize/borderRadius/bg) en las pantallas migradas a este
// sistema de iconos (edit_profile_screen.tsx, change_pwd_screen.tsx),
// factorizado aquí para no repetir el mismo wrapper en cada una.
export function DeviceIconBadge({
  ios,
  android,
  bg,
  containerSize = 40,
  borderRadius = 12,
  size = 20,
  color = '#FFFFFF',
}: DeviceIconBadgeProps) {
  return (
    <View
      style={{
        width: containerSize,
        height: containerSize,
        borderRadius,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <DeviceIcon ios={ios} android={android} size={size} color={color} />
    </View>
  );
}
