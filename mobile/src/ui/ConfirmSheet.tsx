import { useState } from 'react';
import { Modal, View, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Txt } from './components';
import { c } from './theme';
import { errorText } from '../lib/client';

export type Confirmation = {
  title: string;
  description: string;
  actionLabel: string;
  danger?: boolean;
  action: () => Promise<void>;
};

/** Figma 2126:61502: dark bottom sheet, inset explanation and pill actions. */
export function ConfirmSheet({ value, onClose }: { value: Confirmation; onClose: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const { bottom } = useSafeAreaInsets(),
    { height, width } = useWindowDimensions();
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await value.action();
      onClose();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Modal transparent visible animationType='fade' onRequestClose={close}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#0C0D12CC',
          justifyContent: width >= 760 ? 'center' : 'flex-end',
          alignItems: 'center',
        }}
      >
        <Pressable
          style={{ position: 'absolute', inset: 0 }}
          onPress={close}
          disabled={busy}
          accessibilityLabel='Отмена'
          accessibilityRole='button'
        />
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 560,
            maxHeight: height * 0.9,
            backgroundColor: c.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderBottomLeftRadius: width >= 760 ? 24 : 0,
            borderBottomRightRadius: width >= 760 ? 24 : 0,
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottom + 24, gap: 20 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 4,
                backgroundColor: c.inner,
                alignSelf: 'center',
              }}
            />
            <Txt size={20} style={{ fontWeight: '700' }}>
              {value.title}
            </Txt>
            <View style={{ backgroundColor: c.bg, borderRadius: 20, padding: 20 }}>
              <Txt>{value.description}</Txt>
            </View>
            {!!error && (
              <View accessibilityRole='alert'>
                <Txt style={{ color: c.alert }}>{error}</Txt>
                <Txt muted size={13}>
                  Проверьте данные. При конфликте закройте окно и обновите список.
                </Txt>
              </View>
            )}
            <Button
              title={busy ? 'Сохранение…' : value.actionLabel}
              danger={value.danger}
              busy={busy}
              onPress={() => void confirm()}
            />
            <Button title='Отмена' secondary disabled={busy} onPress={close} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
