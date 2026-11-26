import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { STAFF_COLORS as COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { Permission } from '../../constants/enums';

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
  const { isAuthenticated, isLoading, isStaff, can } = useAuth();

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
          // Gyms are set up differently: a tab only shows when the person's role can use it.
          href: can(Permission.CHECKINS_VIEW) ? undefined : null,
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
          href: can(Permission.MEMBERS_VIEW) ? undefined : null,
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
      {/* Detail screens — hidden from tab bar */}
      <Tabs.Screen
        name="member/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="insights"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="renewals"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="plans"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="badges"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="chat"
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
  },
  tabItem: {
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
});
