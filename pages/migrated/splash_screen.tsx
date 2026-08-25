import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, StatusBar } from 'react-native';
import { FONT } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { useResponsiveStyleSheet } from '@helper/responsiveStyleSheet';

export default function SplashScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const { isFromLink = false } = props.route?.params || {};

  useEffect(() => {
    const timer = setTimeout(() => {
      // Check notification permission and initialize
      // Simulating the Flutter init flow
      // In real app: check permissions, load settings, load languages, then navigate
      // props.navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.content}>
        <Image
          source={require('@assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: 150,
      height: 90,
    },
  });
}
