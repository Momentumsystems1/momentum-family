import { useState } from 'react';
import { Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BottomNav, TabKey } from './src/components/BottomNav';
import { FamilyScreen } from './src/screens/FamilyScreen';
import { MapScreen } from './src/screens/MapScreen';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { MemberScreen } from './src/screens/MemberScreen';
import { FamilyMember } from './src/types/domain';
import { colors } from './src/theme/tokens';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('family');
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  const renderScreen = () => {
    if (selectedMember) {
      return <MemberScreen member={selectedMember} onBack={() => setSelectedMember(null)} />;
    }

    switch (activeTab) {
      case 'map':
        return <MapScreen />;
      case 'alerts':
        return <AlertsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <FamilyScreen onMemberPress={setSelectedMember} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.content}>{renderScreen()}</View>
      {!selectedMember && <BottomNav active={activeTab} onChange={setActiveTab} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0,
  },
  content: { flex: 1 },
});
