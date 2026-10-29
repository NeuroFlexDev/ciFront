import { Redirect, Tabs } from 'expo-router';
import { Image } from 'expo-image';

import { useResource, useSession } from '../../lib/session';
import type { Inbox } from '../../lib/types';
import { manages } from '../../lib/types';
import { c } from '../../ui/theme';
import { ErrorState, Loading, Page } from '../../ui/components';
import { usePush } from '../../lib/push';
const icons = {
  index: require('../../../assets/figma/mobile-overview.svg'),
  learning: require('../../../assets/figma/mobile-courses.svg'),
  team: require('../../../assets/figma/mobile-team.svg'),
  results: require('../../../assets/figma/mobile-results.svg'),
  notifications: require('../../../assets/figma/mobile-notifications.svg'),
  profile: require('../../../assets/figma/mobile-profile.svg'),
};
export default function TabsLayout() {
  const { ready, user, startupError, retry } = useSession();
  const inbox = useResource<Inbox>(user ? '/notifications?limit=1' : null);
  usePush();
  if (!ready)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (startupError)
    return (
      <Page>
        <ErrorState error={startupError} retry={retry} />
      </Page>
    );
  if (!user) return <Redirect href='/login' />;
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: c.lime,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopWidth: 0,
          borderRadius: 32,
          position: 'absolute',
          bottom: 16,
          left: 20,
          right: 20,
          height: 66,
          paddingTop: 10,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontFamily: 'Golos', fontSize: 10 },
        tabBarIcon: ({ color }) => (
          <Image
            source={icons[route.name as keyof typeof icons]}
            style={{ height: 22, width: 22 }}
            tintColor={String(color)}
          />
        ),
      })}
    >
      <Tabs.Screen name='index' options={{ title: 'Обзор' }} />
      <Tabs.Screen name='learning' options={{ title: 'Обучение' }} />
      <Tabs.Screen
        name='team'
        options={{ title: 'Команда', href: manages(user) ? undefined : null }}
      />
      <Tabs.Screen
        name='results'
        options={{ title: 'Результаты', href: manages(user) ? null : undefined }}
      />
      <Tabs.Screen
        name='notifications'
        options={{
          title: 'Уведомления',
          tabBarBadge: inbox.data?.unread_count || undefined,
          tabBarBadgeStyle: { backgroundColor: c.lime, color: c.bg },
        }}
      />
      <Tabs.Screen name='profile' options={{ title: 'Профиль' }} />
    </Tabs>
  );
}
