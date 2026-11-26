import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DockTabBar } from '../../../components/navigation/DockTabBar';
import { useTheme } from '../../../context/ThemeContext';
import { useMyCheckIns } from '../../../hooks/members';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focusedName: IoniconsName, outlineName: IoniconsName) {
  return function TabIcon({ focused, color, size }: { focused: boolean; color: string; size: number }) {
    return <Ionicons name={focused ? focusedName : outlineName} size={size} color={color} />;
  };
}

/** The five member tabs. Everything else in (member) is a stack screen pushed over them. */
export default function MemberTabsLayout() {
  const { theme } = useTheme();
  // Same query (and limit) as Home and Check In, so this costs no extra request.
  const latest = useMyCheckIns(7).data?.[0];
  const checkedIn = latest !== undefined && latest.checkedOutAt === null;

  return (
    <Tabs tabBar={(props) => <DockTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="train" options={{ title: 'Train', tabBarIcon: icon('barbell', 'barbell-outline') }} />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check In',
          tabBarIcon: icon('enter', 'enter-outline'),
          // Green dot while the member is checked in.
          tabBarBadge: checkedIn ? '' : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.success },
          tabBarAccessibilityLabel: checkedIn ? 'Check In, checked in now' : 'Check In',
        }}
      />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: icon('chatbubbles', 'chatbubbles-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
