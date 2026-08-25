import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsiveStyleSheet } from '@helper/responsiveStyleSheet';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { FONT } from './theme';

interface GoalCardProps {
  title: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
}

interface MainGoalScreenProps {
  navigation?: any;
  route?: any;
}

const goalData = [
  { title: 'Lose Weight', description: 'Burn fat and reduce body weight', icon: 'flame-outline' as const },
  { title: 'Build Muscle', description: 'Increase muscle mass and strength', icon: 'barbell-outline' as const },
  { title: 'Stay Fit', description: 'Maintain current fitness level', icon: 'heart-outline' as const },
];

const experienceData = [
  { title: 'Beginner', description: 'New to fitness training', icon: 'leaf-outline' as const },
  { title: 'Intermediate', description: '6+ months of training', icon: 'trending-up-outline' as const },
  { title: 'Advanced', description: '2+ years of consistent training', icon: 'flash-outline' as const },
  { title: 'Professional', description: 'Competitive athlete level', icon: 'trophy-outline' as const },
];

const equipmentData = [
  { title: 'Full Gym', description: 'Access to complete gym equipment', icon: 'barbell-outline' as const },
  { title: 'Home Gym', description: 'Basic equipment at home', icon: 'home-outline' as const },
  { title: 'Minimal Equipment', description: 'Dumbbells and resistance bands', icon: 'resize-outline' as const },
  { title: 'No Equipment', description: 'Bodyweight exercises only', icon: 'body-outline' as const },
  { title: 'Outdoor', description: 'Parks and outdoor spaces', icon: 'sunny-outline' as const },
];

export default function MainGoalScreen(props: MainGoalScreenProps) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const [selectedScreen, setSelectedScreen] = useState(0);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(0);
  const [selectedExperienceIndex, setSelectedExperienceIndex] = useState(0);
  const [selectedEquipmentIndex, setSelectedEquipmentIndex] = useState(0);
  const [sliderValue, setSliderValue] = useState(2);

  const styles = useResponsiveStyleSheet({
    container: { flex: 1, backgroundColor: C.bg },
    avatarImage: { width: '100@ratio', height: '200@ratio', alignSelf: 'center', marginTop: '16@ratio', backgroundColor: C.gray70, borderRadius: '12@ratio' },
    stepTitle: { fontSize: '18@ratio', fontFamily: FONT.bold, color: C.white, textAlign: 'center', marginVertical: '16@ratio' },
    goalCard: { backgroundColor: C.surfaceLight, borderRadius: '15@ratio', marginHorizontal: '16@ratio', marginVertical: '8@ratio', padding: '14@ratio' },
    goalCardSelected: { backgroundColor: C.brand5 },
    goalCardRow: { flexDirection: 'row', alignItems: 'center' },
    goalIconBox: { width: '45@ratio', height: '42@ratio', alignItems: 'center', justifyContent: 'center', marginRight: '10@ratio' },
    goalTitle: { fontSize: '15@ratio', fontFamily: FONT.bold },
    goalDesc: { fontSize: '13@ratio', color: C.textSecondary, marginTop: '8@ratio' },
    goalDescSelected: { color: C.white },
    sliderContainer: { paddingHorizontal: '16@ratio', marginTop: '16@ratio' },
    habitCard: { backgroundColor: C.surfaceLight, borderRadius: '10@ratio', padding: '16@ratio', marginHorizontal: '20@ratio', marginBottom: '16@ratio' },
    habitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: '8@ratio' },
    habitLabel: { fontSize: '14@ratio', color: C.white, marginLeft: '8@ratio' },
    sliderValue: { fontSize: '14@ratio', color: C.white, textAlign: 'center', marginTop: '8@ratio' },
    sliderRecommend: { fontSize: '14@ratio', color: C.white, textAlign: 'center', marginTop: '8@ratio' },
    continueBtn: { backgroundColor: C.brand5, borderRadius: '8@ratio', paddingVertical: '15@ratio', paddingHorizontal: '85@ratio', alignSelf: 'center', marginTop: '16@ratio' },
    continueBtnText: { fontSize: '16@ratio', fontFamily: FONT.bold, color: C.white },
  }, [C]);

  const getTitle = () => {
    if (selectedScreen === 0) return 'Main Goal';
    if (selectedScreen === 1) return 'Experience Level';
    if (selectedScreen === 2) return 'Equipment';
    return 'Workout Frequency';
  };

  const handleContinue = () => {
    if (selectedScreen < 3) {
      setSelectedScreen(selectedScreen + 1);
    } else {
      navigation?.replace('MigratedChattingImage');
    }
  };

  const handleBack = () => {
    if (selectedScreen > 0) {
      setSelectedScreen(selectedScreen - 1);
    } else {
      navigation?.goBack();
    }
  };

  const renderGoalCard = (item: { title: string; description: string; icon: any }, isSelected: boolean, onPress: () => void) => (
    <Pressable
      key={item.title}
      style={({ pressed }) => [styles.goalCard, isSelected && styles.goalCardSelected, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.goalCardRow}>
        <View style={styles.goalIconBox}>
          <Ionicons name={item.icon} size={28} color={isSelected ? C.orange : C.gray40} />
        </View>
        <Text style={[styles.goalTitle, { color: isSelected ? C.white : C.textSecondary }]}>{item.title}</Text>
      </View>
      <Text style={[styles.goalDesc, isSelected && styles.goalDescSelected]}>{item.description}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="MightyFitness AI" onBack={handleBack} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Avatar placeholder */}
        <View style={styles.avatarImage} />

        <Text style={styles.stepTitle}>{getTitle()}</Text>

        {/* Step 0: Goals */}
        {selectedScreen === 0 && goalData.map((g, i) =>
          renderGoalCard(g, selectedGoalIndex === i, () => {
            setSelectedGoalIndex(i);
          })
        )}

        {/* Step 1: Experience */}
        {selectedScreen === 1 && experienceData.map((e, i) =>
          renderGoalCard(e, selectedExperienceIndex === i, () => {
            setSelectedExperienceIndex(i);
          })
        )}

        {/* Step 2: Equipment */}
        {selectedScreen === 2 && equipmentData.map((e, i) =>
          renderGoalCard(e, selectedEquipmentIndex === i, () => {
            setSelectedEquipmentIndex(i);
          })
        )}

        {/* Step 3: Workout Frequency */}
        {selectedScreen === 3 && (
          <View style={styles.sliderContainer}>
            <View style={styles.habitCard}>
              <View style={styles.habitRow}>
                <Ionicons name="trending-up" size={20} color={C.white} />
                <Text style={styles.habitLabel}>Easy Habit Formation</Text>
              </View>
              <View style={{ height: 8 }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: C.brand10, overflow: 'hidden' }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: C.brand5, width: `${Math.min((0.9 / sliderValue) * 100, 100)}%` }} />
                </View>
              </View>
              <View style={[styles.habitRow, { marginTop: 16 }]}>
                <Ionicons name="speedometer" size={20} color={C.white} />
                <Text style={styles.habitLabel}>Progression Speed</Text>
              </View>
              <View style={{ height: 8 }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: C.brand10, overflow: 'hidden' }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: C.brand5, width: `${(sliderValue / 10) * 100}%` }} />
                </View>
              </View>
            </View>
            {/* Slider */}
            <View style={{ marginHorizontal: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5, 6, 7].map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => setSliderValue(v)}
                    style={({ pressed }) => [
                      {
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: v === sliderValue ? C.brand5 : C.surfaceLight,
                        alignItems: 'center', justifyContent: 'center',
                      },
                      pressed && { opacity: 0.2 },
                    ]}
                  >
                    <Text style={{ color: C.white, fontFamily: FONT.bold }}>{v}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Text style={styles.sliderValue}>{sliderValue} times/week</Text>
            <Text style={styles.sliderRecommend}>Recommended: {sliderValue} times/week</Text>
          </View>
        )}

        <Pressable style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.2 }]} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>{selectedScreen === 3 ? 'Finish' : 'Continue'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
