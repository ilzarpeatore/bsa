import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@components/ui/text';
import { Card } from '@components/ui/card';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';

export default function TermsAndConditionsScreen(props: any) {
  const { colors: C } = useAppColorMode();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Terms of Services" onBack={() => props.navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Card variant="outline">
          <Text muted className="leading-6">
            {`Terms and Conditions\n\n` +
              `Welcome to MightyFitness. By using our application, you agree to the following terms and conditions.\n\n` +
              `1. Acceptance of Terms\n` +
              `By accessing or using the MightyFitness application, you agree to be bound by these Terms and Conditions.\n\n` +
              `2. Use of the Application\n` +
              `You may use this application for personal, non-commercial purposes only.\n\n` +
              `3. User Accounts\n` +
              `You are responsible for maintaining the confidentiality of your account credentials.\n\n` +
              `4. Privacy\n` +
              `Your use of this application is also governed by our Privacy Policy.\n\n` +
              `5. Subscriptions\n` +
              `Paid plans are arranged and billed outside the app, directly with your coach. This application does not process any payment.`}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
