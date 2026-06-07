import { Redirect, Tabs } from 'expo-router';
import { Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

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
  return (
    <Ionicons
      name={focused ? iconFocused : iconUnfocused}
      size={22}
      color={focused ? COLORS.primary : COLORS.textMuted}
    />
  );
}

function CenterTabButton({ onPress, accessibilityLabel }: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.82}
      style={styles.centerWrapper}
    >
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.centerGradient}
      >
        <Ionicons name="scan" size={26} color="#000" />
      </LinearGradient>
      <Text style={styles.centerLabel}>Check In</Text>
    </TouchableOpacity>
  );
}

export default function MemberLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/entry" />;
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
        name="announcements"
        options={{
          title: 'News',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="megaphone" iconUnfocused="megaphone-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: '',
          tabBarButton: (props) => <CenterTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Ranks',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="trophy" iconUnfocused="trophy-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="flash" iconUnfocused="flash-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFocused="person" iconUnfocused="person-outline" focused={focused} />
          ),
        }}
      />
      {/* Chat is still a route but hidden from the tab bar */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}

const TAB_BAR_HEIGHT = 72;
const CENTER_BTN_SIZE = 58;
const CENTER_FLOAT = 20;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: TAB_BAR_HEIGHT,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    paddingTop: 8,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 12,
  },
  tabItem: {
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  centerWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 70,
    marginTop: -CENTER_FLOAT,
  },
  centerGradient: {
    width: CENTER_BTN_SIZE,
    height: CENTER_BTN_SIZE,
    borderRadius: CENTER_BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  centerLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 5,
  },
});
