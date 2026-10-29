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
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { errorText } from '../lib/client';
import { c } from './theme';
export function Txt({
  children,
  muted = false,
  heading = false,
  size = 16,
  style,
  selectable = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
  heading?: boolean;
  size?: number;
  style?: any;
  selectable?: boolean;
}) {
  return (
    <Text
      selectable={selectable}
      style={[
        {
          fontFamily: heading ? 'Days' : 'Golos',
          fontSize: size,
          lineHeight: size * 1.4,
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
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  secondary?: boolean;
  disabled?: boolean;
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
        { opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? c.lime : c.bg} />
      ) : (
        <Txt
          size={14}
          style={{ color: secondary ? c.text : c.bg, fontWeight: '600', textAlign: 'center' }}
        >
          {title}
        </Txt>
      )}
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
  return (
    <View style={{ gap: 8 }}>
      <Txt size={13} muted>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.dim}
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 128, textAlignVertical: 'top' },
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
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  back?: boolean;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={s.header}>
        {back ? (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Назад'
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
          >
            <Txt size={25}>‹</Txt>
          </Pressable>
        ) : (
          <Image
            source={require('../../assets/figma/brand.svg')}
            style={{ width: 146, height: 20 }}
            contentFit='contain'
          />
        )}
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole='button'
          accessibilityLabel='Профиль и настройки'
          style={s.menu}
        >
          <Image
            source={require('../../assets/figma/mobile-menu.svg')}
            style={{ width: 24, height: 24 }}
          />
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={s.page}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.lime} />
          ) : undefined
        }
      >
        {title && (
          <Txt heading size={30}>
            {title}
          </Txt>
        )}
        {subtitle && <Txt muted>{subtitle}</Txt>}
        {children}
        <View style={{ height: 90 }} />
      </ScrollView>
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
export function Progress({ value }: { value: number }) {
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
          backgroundColor: c.lime,
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
            backgroundColor: value === item.id ? c.lime : c.card,
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
    gap: 20,
    paddingTop: 16,
    paddingBottom: 20,
    maxWidth: 780,
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
  card: { padding: 24, borderRadius: 24, backgroundColor: c.card, gap: 16 },
  button: {
    minHeight: 48,
    borderRadius: 28,
    backgroundColor: c.lime,
    paddingHorizontal: 22,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
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
