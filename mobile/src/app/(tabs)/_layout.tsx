import { Redirect, Tabs } from 'expo-router';
import { useSession } from '../../lib/session';
import { ErrorState, Loading, Page } from '../../ui/components';
import { NativeTabBar } from '../../ui/NativeTabBar';

export default function TabsLayout() {
  const { ready, user, startupError, retry } = useSession();
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
    <Tabs tabBar={(props) => <NativeTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name='index' options={{ title: 'Обзор' }} />
      <Tabs.Screen name='learning' options={{ title: 'Обучение' }} />
      <Tabs.Screen name='team' options={{ title: 'Команда' }} />
      <Tabs.Screen name='results' options={{ title: 'Результаты' }} />
      <Tabs.Screen name='notifications' options={{ title: 'Уведомления' }} />
      <Tabs.Screen name='profile' options={{ title: 'Профиль' }} />
    </Tabs>
  );
}
