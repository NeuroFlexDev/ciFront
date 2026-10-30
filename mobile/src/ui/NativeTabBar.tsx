import { useEffect, useState } from 'react';
import { Keyboard, Pressable, View, useWindowDimensions } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useSession, useResource } from '../lib/session';
import { manages, type Inbox } from '../lib/types';
import { Icon, Txt, type icons } from './components';
import { c } from './theme';

const names: Record<string, { icon: keyof typeof icons; label: string }> = {
  index: { icon: 'overview', label: 'Обзор' },
  learning: { icon: 'courses', label: 'Обучение' },
  team: { icon: 'team', label: 'Команда' },
  results: { icon: 'results', label: 'Результаты' },
  notifications: { icon: 'notifications', label: 'Уведомления' },
  profile: { icon: 'profile', label: 'Профиль' },
};
export function NativeTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { user } = useSession();
  const manager = manages(user),
    { width, height, fontScale } = useWindowDimensions();
  const rail = width >= 760 && width > height;
  const [keyboard, setKeyboard] = useState(false);
  const inbox = useResource<Inbox>(user ? '/notifications?limit=1' : null);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboard) return null;
  const visible = manager
    ? ['index', 'learning', 'team', 'results', 'profile']
    : ['index', 'learning', 'results', 'notifications', 'profile'];
  return (
    <View
      style={{
        position: 'absolute',
        bottom: Math.max(insets.bottom, 16),
        alignSelf: 'center',
        width: Math.min(width - 40, 500),
        backgroundColor: c.card,
        padding: 8,
        borderRadius: 40,
        flexDirection: 'row',
        gap: width < 360 ? 4 : 8,
        justifyContent: 'space-between',
        ...(rail
          ? {
              right: 20,
              bottom: Math.max(insets.bottom, 40),
              width: 60,
              flexDirection: 'column' as const,
            }
          : {}),
      }}
    >
      {visible.map((name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return null;
        const selected = state.routes[state.index].key === route.key;
        const label = name === 'learning' && manager ? 'Регламенты' : names[name].label;
        return (
          <Pressable
            key={route.key}
            accessibilityRole='tab'
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => {
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!selected && !event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            style={({ pressed }) => ({
              minWidth: 44,
              minHeight: 44,
              paddingHorizontal: 10,
              borderRadius: 28,
              backgroundColor: c.bg,
              flexDirection: 'row',
              gap: 6,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.65 : 1,
              flexShrink: 1,
            })}
          >
            <Icon name={names[name].icon} color={selected ? c.lime : c.text} size={24} />
            {selected && !rail && fontScale < 1.4 && width >= 360 && (
              <Txt size={11} style={{ color: c.lime, flexShrink: 1 }}>
                {label}
              </Txt>
            )}
            {name === 'notifications' && !!inbox.data?.unread_count && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: c.lime,
                  position: 'absolute',
                  right: 7,
                  top: 6,
                }}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
