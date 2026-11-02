import { router } from 'expo-router';
import { Page, Empty, Button } from '../ui/components';
export default function NotFound() {
  return (
    <Page>
      <Empty title='Экран не найден' body='Ссылка устарела или содержит ошибку.' />
      <Button title='На главную' onPress={() => router.replace('/')} />
    </Page>
  );
}
