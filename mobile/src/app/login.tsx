import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { api, useSession } from '../lib/session';
import type { Session } from '../lib/types';
import { Button, Card, ErrorState, Field, Page, Txt } from '../ui/components';
export default function Login() {
  const [identity, setIdentity] = useState(''),
    [password, setPassword] = useState(''),
    [code, setCode] = useState(''),
    [challenge, setChallenge] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const { login } = useSession();
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = challenge
        ? await api.public<Session>('/auth/mfa/verify', { challenge_token: challenge, code })
        : await api.public<Session | { mfa_required: true; challenge_token: string }>(
            '/auth/mobile/login',
            { email: identity.trim(), password, device_name: 'Lernium ' + Platform.OS },
          );
      if ('mfa_required' in result) {
        setChallenge(result.challenge_token);
        setPassword('');
        return;
      }
      await login(result);
      setPassword('');
      router.replace('/');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Page>
        <Image
          source={require('../../assets/figma/assistant-orb.webp')}
          style={{ width: 170, height: 170, alignSelf: 'center', marginTop: 32 }}
        />
        <Txt heading size={32}>
          {challenge ? 'Подтвердите вход' : 'Знания, которые\nработают'}
        </Txt>
        <Txt muted>
          {challenge
            ? 'Введите код из приложения аутентификации или резервный код.'
            : 'Регламенты, обучение и команда — всегда под рукой.'}
        </Txt>
        <Card>
          {challenge ? (
            <Field
              label='Код подтверждения'
              value={code}
              onChangeText={setCode}
              autoCapitalize='none'
              autoComplete='one-time-code'
            />
          ) : (
            <>
              <Field
                label='Email или логин'
                value={identity}
                onChangeText={setIdentity}
                autoCapitalize='none'
                autoCorrect={false}
                autoComplete='username'
              />
              <Field
                label='Пароль'
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete='current-password'
              />
            </>
          )}
          {!!error && <ErrorState error={error} />}
          <Button
            title='Войти'
            busy={busy}
            disabled={challenge ? !code : !identity || !password}
            onPress={() => void submit()}
          />
          {challenge && (
            <Button
              title='Вернуться ко входу'
              secondary
              onPress={() => {
                setChallenge('');
                setCode('');
              }}
            />
          )}
        </Card>
        <Txt size={12} muted>
          Войдите с аккаунтом, который выдал руководитель. Доступные разделы определяются вашей
          ролью в компании.
        </Txt>
      </Page>
    </KeyboardAvoidingView>
  );
}
