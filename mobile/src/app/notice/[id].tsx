import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useResource } from '../../lib/session';
import { API_ORIGIN } from '../../lib/config';
import type { Notice } from '../../lib/types';
import { Page, Card, Txt, Button, Loading, ErrorState } from '../../ui/components';
export default function NoticeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    q = useResource<Notice>('/notifications/' + id),
    [error, setError] = useState<unknown>(null);
  return (
    <Page title={q.data?.title || 'Уведомление'} back>
      {q.isPending && <Loading />}
      {!!(q.error || error) && (
        <ErrorState error={q.error || error} retry={() => void q.refetch()} />
      )}
      {q.data && (
        <Card>
          <Txt>{q.data.body}</Txt>
          {q.data.resource_type === 'course' && Number.isSafeInteger(q.data.resource_id) && (
            <Button
              title='Открыть в веб-платформе'
              onPress={() =>
                void WebBrowser.openBrowserAsync(
                  API_ORIGIN + '/courses/' + q.data!.resource_id + '/edit',
                ).catch(setError)
              }
            />
          )}
          <Button
            title='К уведомлениям'
            secondary
            onPress={() => router.replace('/notifications')}
          />
        </Card>
      )}
    </Page>
  );
}
