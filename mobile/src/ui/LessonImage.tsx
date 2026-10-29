import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { api } from '../lib/session';
import { API_ORIGIN } from '../lib/config';
import { Button, Txt } from './components';

export function LessonImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0),
    [ratio, setRatio] = useState(1.6);
  let url: URL;
  try {
    url = new URL(src, API_ORIGIN);
  } catch {
    return <Txt muted>У изображения некорректный адрес.</Txt>;
  }
  const privateMedia =
    url.origin === API_ORIGIN && /^\/api\/images\/\d+\/content$/.test(url.pathname);
  if (url.protocol !== 'https:' && !privateMedia)
    return <Txt muted>Изображение доступно только по защищённому адресу.</Txt>;
  async function retry() {
    try {
      if (privateMedia) await api.request('/auth/me');
      setFailed(false);
      setAttempt((v) => v + 1);
    } catch {
      setFailed(true);
    }
  }
  return (
    <View style={{ gap: 8, width: '100%' }}>
      {failed ? (
        <>
          <Txt muted>{alt || 'Иллюстрация'}: не удалось загрузить.</Txt>
          <Button title='Повторить загрузку' secondary onPress={() => void retry()} />
        </>
      ) : (
        <Image
          key={attempt}
          source={{
            uri: url.href,
            ...(privateMedia
              ? { headers: { Authorization: 'Bearer ' + api.session?.access_token } }
              : {}),
          }}
          accessibilityLabel={alt}
          contentFit='contain'
          cachePolicy='none'
          style={{ width: '100%', aspectRatio: ratio, borderRadius: 12 }}
          onLoad={(event) => {
            if (event.source.width && event.source.height)
              setRatio(event.source.width / event.source.height);
          }}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}
