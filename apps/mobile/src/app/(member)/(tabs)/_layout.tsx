import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DockTabBar } from '../../../components/navigation/DockTabBar';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focusedName: IoniconsName, outlineName: IoniconsName) {
  return function TabIcon({ focused, color, size }: { focused: boolean; color: string; size: number }) {
    return <Ionicons name={focused ? focusedName : outlineName} size={size} color={color} />;
  };
}

/** The five member tabs. Everything else in (member) is a stack screen pushed over them. */
export default function MemberTabsLayout() {
  return (
    <Tabs tabBar={(props) => <DockTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="train" options={{ title: 'Train', tabBarIcon: icon('barbell', 'barbell-outline') }} />
      <Tabs.Screen name="checkin" options={{ title: 'Check In', tabBarIcon: icon('enter', 'enter-outline') }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: icon('chatbubbles', 'chatbubbles-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
