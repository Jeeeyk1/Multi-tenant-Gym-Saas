import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  iconFocused,
  iconUnfocused,
  focused,
  size = 22,
}: {
  iconFocused: IoniconsName;
  iconUnfocused: IoniconsName;
  focused: boolean;
  size?: number;
}) {
  return (
    <Ionicons
      name={focused ? iconFocused : iconUnfocused}
      size={size}
      color={focused ? COLORS.primary : COLORS.textMuted}
    />
  );
}

export default function StaffLayout() {
  const { isAuthenticated, isLoading, isStaff } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/entry" />;
  }

  // Members who somehow land here get sent to their own section
  if (!isLoading && !isStaff) {
    return <Redirect href="/(member)/dashboard" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
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
        name="checkins"
        options={{
          title: 'Check-ins',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconFocused="checkmark-circle"
              iconUnfocused="checkmark-circle-outline"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="people" iconUnfocused="people-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: 'Announce',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconFocused="megaphone"
              iconUnfocused="megaphone-outline"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="menu" iconUnfocused="menu-outline" focused={focused} />
          ),
        }}
      />
      {/* Detail screen — hidden from tab bar */}
      <Tabs.Screen
        name="member/[id]"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 80 : 64,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
});
