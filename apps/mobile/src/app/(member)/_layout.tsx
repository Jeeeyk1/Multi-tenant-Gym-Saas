import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  iconFocused,
  iconUnfocused,
  focused,
}: {
  iconFocused: IoniconsName;
  iconUnfocused: IoniconsName;
  focused: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Ionicons
      name={focused ? iconFocused : iconUnfocused}
      size={22}
      color={focused ? theme.primary : COLORS.textMuted}
    />
  );
}

const HIDDEN: object = { tabBarItemStyle: { display: 'none' }, tabBarButton: () => null };

export default function MemberLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/entry" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="home" iconUnfocused="home-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Train',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="barbell" iconUnfocused="barbell-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check In',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="scan" iconUnfocused="scan-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="hub"
        options={{
          title: 'Community',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="compass" iconUnfocused="compass-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Me',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="person" iconUnfocused="person-outline" focused={focused} />
          ),
        }}
      />

      {/* Routes accessible within tabs — not shown in the tab bar */}
      <Tabs.Screen name="announcements" options={HIDDEN} />
      <Tabs.Screen name="chat" options={HIDDEN} />
      <Tabs.Screen name="leaderboard" options={HIDDEN} />
      <Tabs.Screen name="ai" options={HIDDEN} />
      <Tabs.Screen name="workout" options={HIDDEN} />
      <Tabs.Screen name="workout-history" options={HIDDEN} />
    </Tabs>
  );
}
