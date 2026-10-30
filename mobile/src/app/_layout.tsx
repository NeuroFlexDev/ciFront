import React, { Component } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SessionProvider, useSession } from '../lib/session';
import { manages } from '../lib/types';
import { c } from '../ui/theme';
import { usePush } from '../lib/push';
import { Button, Txt, Page, Loading, ErrorState } from '../ui/components';
class Boundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <View
        style={{ flex: 1, backgroundColor: c.bg, padding: 32, justifyContent: 'center', gap: 24 }}
      >
        <Txt heading size={28}>
          Не удалось открыть экран
        </Txt>
        <Txt muted>
          Сохранённые ответы остались на устройстве. Попробуйте открыть приложение ещё раз.
        </Txt>
        <Button title='Повторить' onPress={() => this.setState({ failed: false })} />
      </View>
    ) : (
      this.props.children
    );
  }
}
export default function RootLayout() {
  const [fonts, error] = useFonts({
    Days: require('../../assets/fonts/DaysOne-Regular.ttf'),
    Golos: require('../../assets/fonts/GolosText-VariableFont_wght.ttf'),
  });
  if (!fonts && !error) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return (
    <Boundary>
      <SessionProvider>
        <StatusBar style='light' />
        <Navigation />
      </SessionProvider>
    </Boundary>
  );
}
function Navigation() {
  const { user, ready, startupError, retry } = useSession();
  usePush(ready && !startupError);
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
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Protected guard={!user}>
        <Stack.Screen name='login' />
      </Stack.Protected>
      <Stack.Protected guard={!!user} redirectTo='/login'>
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='assignment/[id]' />
        <Stack.Screen name='my-learning' />
        <Stack.Screen name='notification-settings' />
        <Stack.Screen name='notice/[id]' />
        <Stack.Protected guard={manages(user)}>
          <Stack.Screen name='person/new' />
          <Stack.Screen name='person/[id]' />
          <Stack.Screen name='positions' />
          <Stack.Screen name='position/[id]' />
          <Stack.Screen name='reviews' />
          <Stack.Screen name='review/[id]' />
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );
}
