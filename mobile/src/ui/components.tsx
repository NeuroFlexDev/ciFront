import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  AccessibilityInfo,
  Modal,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { errorText } from '../lib/client';
import { useSession, useResource } from '../lib/session';
import { manages, roles, type Inbox } from '../lib/types';
import { c } from './theme';
export function Txt({
  children,
  muted = false,
  heading = false,
  size = 16,
  style,
  selectable = false,
  numberOfLines,
}: {
  children: React.ReactNode;
  muted?: boolean;
  heading?: boolean;
  size?: number;
  style?: any;
  selectable?: boolean;
  numberOfLines?: number;
}) {
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: heading ? 'Days' : 'Golos',
          fontSize: size,
          lineHeight: size * (heading ? 1.25 : 1.4),
          color: muted ? c.muted : c.text,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  busy = false,
  secondary = false,
  disabled = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  secondary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        compact && { minHeight: 40, paddingVertical: 8, paddingHorizontal: 16 },
        { opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      {busy && <ActivityIndicator color={secondary ? c.lime : c.bg} />}
      <Txt
        size={14}
        style={{ color: secondary ? c.text : c.bg, fontWeight: '600', textAlign: 'center' }}
      >
        {title}
      </Txt>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Txt size={13} muted>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.dim}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          s.input,
          props.multiline && { minHeight: 128, textAlignVertical: 'top' },
          focused && { borderColor: c.lime },
          props.style,
        ]}
      />
    </View>
  );
}
export function Page({
  children,
  title,
  subtitle,
  refreshing,
  onRefresh,
  back = false,
  headerTitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  back?: boolean;
  headerTitle?: string;
}) {
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const rail = !back && width >= 760 && width > height;
  const [menuOpen, setMenuOpen] = useState(false);
  const inbox = useResource<Inbox>(user ? '/notifications?limit=1' : null);
  const navigate = (path: Parameters<typeof router.push>[0]) => {
    setMenuOpen(false);
    router.push(path);
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          {back ? (
            <IconButton
              name='back'
              label='Назад'
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          ) : (
            <Image
              source={require('../../assets/figma/brand.svg')}
              style={{ width: 146, height: 20 }}
              contentFit='contain'
            />
          )}
          {back && headerTitle && (
            <Txt size={16} style={{ flex: 1, fontWeight: '600' }}>
              {headerTitle}
            </Txt>
          )}
        </View>
        {user && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton
              name='notifications'
              label={`Уведомления${inbox.data?.unread_count ? ': ' + inbox.data.unread_count + ' непрочитанных' : ''}`}
              onPress={() => router.push('/notifications')}
              dot={!!inbox.data?.unread_count}
            />
            <IconButton
              name='menu'
              label='Открыть меню профиля'
              onPress={() => setMenuOpen(true)}
            />
          </View>
        )}
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={[
            s.page,
            { paddingBottom: back ? insets.bottom + 32 : insets.bottom + 108 },
            rail && { paddingRight: 100, paddingBottom: 32 },
          ]}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.lime} />
            ) : undefined
          }
        >
          {(title || subtitle) && (
            <View style={{ gap: 8 }}>
              {title && (
                <Txt heading size={26}>
                  {title}
                </Txt>
              )}
              {subtitle && (
                <Txt muted size={14}>
                  {subtitle}
                </Txt>
              )}
            </View>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={menuOpen}
        transparent
        animationType='fade'
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' }}>
          <Pressable
            style={{ position: 'absolute', inset: 0 }}
            onPress={() => setMenuOpen(false)}
            accessibilityRole='button'
            accessibilityLabel='Закрыть меню'
          />
          <View
            style={{
              backgroundColor: c.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: insets.bottom + 24,
              gap: 16,
            }}
            accessibilityViewIsModal
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Avatar name={user?.full_name || user?.username || ''} size={56} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt size={18} style={{ fontWeight: '600' }}>
                  {user?.full_name || user?.username}
                </Txt>
                <Txt muted size={13}>
                  {roles[user?.organization_role || 'member']}
                </Txt>
              </View>
              <Button title='Закрыть' compact secondary onPress={() => setMenuOpen(false)} />
            </View>
            <MenuRow icon='profile' label='Личный профиль' onPress={() => navigate('/profile')} />
            <MenuRow
              icon='notifications'
              label='Уведомления'
              onPress={() => navigate('/notifications')}
            />
            <MenuRow
              icon='results'
              label='Мои результаты'
              onPress={() => navigate('/results?view=mine')}
            />
            {manages(user) && (
              <MenuRow icon='team' label='Команда и должности' onPress={() => navigate('/team')} />
            )}
            <MenuRow
              icon='notifications'
              label='Настройки уведомлений'
              onPress={() => navigate('/notification-settings')}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Card>
      <Txt style={{ color: c.alert }}>{errorText(error)}</Txt>
      {retry && <Button title='Повторить' secondary onPress={retry} />}
    </Card>
  );
}
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Txt size={20}>{title}</Txt>
      <Txt muted>{body}</Txt>
    </Card>
  );
}
export function Loading() {
  const [opacity] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (active && !reduce) {
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
          ]),
        );
        loop.start();
      }
    });
    return () => {
      active = false;
      loop?.stop();
    };
  }, [opacity]);
  return (
    <Animated.View
      accessibilityLabel='Загрузка'
      accessibilityRole='progressbar'
      style={{ gap: 16, opacity }}
    >
      {[1, 2, 3].map((n) => (
        <View
          key={n}
          style={{ height: n === 1 ? 48 : 140, borderRadius: 24, backgroundColor: c.card }}
        />
      ))}
    </Animated.View>
  );
}
export function Progress({ value, alert = false }: { value: number; alert?: boolean }) {
  return (
    <View
      accessibilityRole='progressbar'
      accessibilityValue={{ min: 0, max: 100, now: value }}
      style={{ height: 8, borderRadius: 4, backgroundColor: c.inner, overflow: 'hidden' }}
    >
      <View
        style={{
          height: 8,
          width: Math.max(0, Math.min(100, value)) + '%',
          backgroundColor: alert ? c.alert : c.lime,
          borderRadius: 4,
        }}
      />
    </View>
  );
}
export function Chips({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onChange(item.id)}
          accessibilityRole='button'
          accessibilityState={{ selected: value === item.id }}
          style={{
            backgroundColor: value === item.id ? c.lime : c.inner,
            borderRadius: 30,
            paddingHorizontal: 16,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Txt size={13} style={{ color: value === item.id ? c.bg : c.text }}>
            {item.label}
          </Txt>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export const s = StyleSheet.create({
  page: {
    paddingHorizontal: 20,
    gap: 24,
    paddingTop: 16,
    paddingBottom: 20,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 20,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menu: {
    width: 44,
    height: 44,
    borderRadius: 24,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { padding: 20, borderRadius: 20, backgroundColor: c.card, gap: 16 },
  button: {
    minHeight: 48,
    borderRadius: 28,
    backgroundColor: c.lime,
    paddingHorizontal: 22,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.line },
  input: {
    color: c.text,
    fontFamily: 'Golos',
    fontSize: 16,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 16,
    padding: 16,
    minHeight: 52,
  },
});

export const icons = {
  overview: require('../../assets/figma/mobile-overview.svg'),
  courses: require('../../assets/figma/mobile-courses.svg'),
  team: require('../../assets/figma/mobile-team.svg'),
  results: require('../../assets/figma/mobile-results.svg'),
  notifications: require('../../assets/figma/mobile-notifications.svg'),
  profile: require('../../assets/figma/mobile-profile.svg'),
  menu: require('../../assets/figma/mobile-menu.svg'),
  back: require('../../assets/figma/arrow-left.svg'),
  info: require('../../assets/figma/info.svg'),
  assign: require('../../assets/figma/assign.svg'),
};
export function Icon({
  name,
  color = c.text,
  size = 24,
}: {
  name: keyof typeof icons;
  color?: string;
  size?: number;
}) {
  return (
    <Image
      source={icons[name]}
      style={{ width: size, height: size }}
      contentFit='contain'
      tintColor={color}
    />
  );
}
export function IconButton({
  name,
  label,
  onPress,
  dot = false,
}: {
  name: keyof typeof icons;
  label: string;
  onPress: () => void;
  dot?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.menu, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Icon name={name} />
      {dot && (
        <View
          style={{
            position: 'absolute',
            top: 7,
            right: 8,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: c.lime,
          }}
        />
      )}
    </Pressable>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'alert';
}) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 24,
        backgroundColor: tone === 'accent' ? c.lime : tone === 'alert' ? c.alert : c.inner,
      }}
    >
      <Txt size={12} style={{ color: tone === 'neutral' ? c.text : c.bg, fontWeight: '500' }}>
        {children}
      </Txt>
    </View>
  );
}
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'Л';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.bg,
        borderWidth: size > 80 ? 3 : 1,
        borderColor: size > 80 ? c.lime : c.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt heading size={size * 0.28}>
        {initials}
      </Txt>
    </View>
  );
}
export function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof icons;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        minHeight: 48,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Icon name={icon} />
      <Txt style={{ flex: 1 }}>{label}</Txt>
      <Txt muted>↗</Txt>
    </Pressable>
  );
}
