import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { STAFF_COLORS as COLORS } from '../../constants/theme';
import { DockTabBar, type DockPalette } from '../../components/navigation/DockTabBar';
import { useAuth } from '../../context/AuthContext';
import { Permission } from '../../constants/enums';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focusedName: IoniconsName, outlineName: IoniconsName) {
  return function TabIcon({ focused, color, size }: { focused: boolean; color: string; size: number }) {
    return <Ionicons name={focused ? focusedName : outlineName} size={size} color={color} />;
  };
}

/** Staff use fixed FitOps colours, never the gym's theme. */
const STAFF_DOCK: DockPalette = {
  background: COLORS.background,
  surface: COLORS.surface,
  border: COLORS.border,
  accent: COLORS.primary,
  accentMuted: `${COLORS.primary}26`,
  label: COLORS.primary,
  inactive: COLORS.textMuted,
  badge: COLORS.error,
};

export default function StaffLayout() {
  const { isAuthenticated, isLoading, isStaff, can } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/entry" />;
  }

  // Members who somehow land here get sent to their own section
  if (!isLoading && !isStaff) {
    return <Redirect href="/(member)/(tabs)/dashboard" />;
  }

  return (
    <Tabs tabBar={(props) => <DockTabBar {...props} palette={STAFF_DOCK} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: icon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="checkins"
        options={{
          // Gyms are set up differently: a tab only shows when the person's role can use it.
          href: can(Permission.CHECKINS_VIEW) ? undefined : null,
          title: 'Check-ins',
          tabBarIcon: icon('checkmark-circle', 'checkmark-circle-outline'),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          href: can(Permission.MEMBERS_VIEW) ? undefined : null,
          title: 'Members',
          tabBarIcon: icon('people', 'people-outline'),
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: 'Announce',
          tabBarIcon: icon('megaphone', 'megaphone-outline'),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: icon('menu', 'menu-outline'),
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
