import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Client, ApiError } from '../src/lib/client';
import type { Session } from '../src/lib/types';
const session: Session = {
  access_token: 'old',
  refresh_token: 'refresh',
  expires_in: 10,
  user: { id: 1, email: null, full_name: 'One', organization_id: 1, organization_role: 'member' },
};
const result = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
test('concurrent 401s share one refresh and atomically persist before retry', async () => {
  let rotations = 0,
    persisted = false;
  const transport = async (url: unknown, options: any) => {
    if (String(url).endsWith('/refresh')) {
      rotations++;
      await new Promise((r) => setTimeout(r, 10));
      return result({ ...session, access_token: 'new', refresh_token: 'rotated' });
    }
    if (options.headers.Authorization === 'Bearer old') return result({}, 401);
    assert.equal(persisted, true);
    return result({ ok: true });
  };
  const client = new Client(
    'https://example.test',
    async (s) => {
      if (s?.access_token === 'new') persisted = true;
    },
    () => {},
    transport as typeof fetch,
  );
  await client.replace(session);
  await Promise.all([client.request('/one'), client.request('/two'), client.request('/three')]);
  assert.equal(rotations, 1);
  assert.equal(client.session?.refresh_token, 'rotated');
});
test('late 401 from old token cannot rotate the new refresh token again', async () => {
  let rotations = 0;
  const transport = async (url: unknown, options: any) => {
    if (String(url).endsWith('/refresh')) {
      rotations++;
      return result({ ...session, access_token: 'new', refresh_token: 'rotated' });
    }
    if (options.headers.Authorization === 'Bearer old') {
      if (String(url).endsWith('/slow')) await new Promise((r) => setTimeout(r, 30));
      return result({}, 401);
    }
    return result({ ok: true });
  };
  const client = new Client(
    'https://example.test',
    async () => {},
    () => {},
    transport as typeof fetch,
  );
  await client.replace(session);
  await Promise.all([client.request('/fast'), client.request('/slow')]);
  assert.equal(rotations, 1);
});
test('ambiguous refresh failure clears credentials instead of replaying a consumed token', async () => {
  let expired = 0,
    rotations = 0;
  const transport = async (url: unknown) => {
    if (String(url).endsWith('/refresh')) {
      rotations++;
      throw new TypeError('Network failure');
    }
    return result({}, 401);
  };
  const client = new Client(
    'https://example.test',
    async () => {},
    () => {
      expired++;
    },
    transport as typeof fetch,
  );
  await client.replace(session);
  await assert.rejects(() => client.request('/one'));
  await assert.rejects(() => client.request('/two'));
  assert.equal(client.session, null);
  assert.equal(rotations, 1);
  assert.equal(expired, 1);
});
test('account switch discards responses from the previous principal', async () => {
  let resolve: (r: Response) => void = () => {};
  const client = new Client(
    'https://example.test',
    async () => {},
    () => {},
    (() =>
      new Promise((r) => {
        resolve = r;
      })) as typeof fetch,
  );
  await client.replace(session);
  const pending = client.request('/private');
  await client.replace({ ...session, user: { ...session.user, id: 2 } });
  resolve(result({ secret: 'previous account' }));
  await assert.rejects(
    () => pending,
    (error: unknown) => error instanceof ApiError && error.status === 401,
  );
});
test('conflict is not automatically retried or overwritten', async () => {
  let requests = 0;
  const client = new Client(
    'https://example.test',
    async () => {},
    () => {},
    (async () => {
      requests++;
      return result({ detail: 'Changed elsewhere' }, 409);
    }) as typeof fetch,
  );
  await client.replace(session);
  await assert.rejects(
    () => client.request('/answer', 'PUT', { text: 'mine' }),
    (error: unknown) => error instanceof ApiError && error.status === 409,
  );
  assert.equal(requests, 1);
});

test('a truncated success response never reports a saved mutation', async () => {
  const client = new Client(
    'https://example.test',
    async () => {},
    () => {},
    (async () => new Response('{"incomplete":', { status: 200 })) as typeof fetch,
  );
  await client.replace(session);
  await assert.rejects(
    () => client.request('/answer', 'POST', { text: 'mine' }),
    (error: unknown) => error instanceof ApiError && error.status === 502,
  );
});

test('an account change during secure persistence cannot restore an old session', async () => {
  let startSave: () => void = () => {},
    releaseSave: () => void = () => {};
  const saving = new Promise<void>((resolve) => {
    startSave = resolve;
  });
  const release = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  let stored: Session | null = null;
  const client = new Client(
    'https://example.test',
    async (value) => {
      if (value?.access_token === 'rotated') {
        startSave();
        await release;
      }
      stored = value;
    },
    () => {},
    (async (url: unknown) =>
      String(url).endsWith('/refresh')
        ? result({ ...session, access_token: 'rotated' })
        : result({}, 401)) as typeof fetch,
  );
  await client.replace(session);
  const oldRequest = client.request('/old');
  const rejected = assert.rejects(
    () => oldRequest,
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
  await saving;
  const replacement = {
    ...session,
    access_token: 'other-account',
    user: { ...session.user, id: 2 },
  };
  const switched = client.replace(replacement);
  releaseSave();
  await switched;
  await rejected;
  assert.equal(client.session?.user.id, 2);
  assert.equal((stored as Session | null)?.user.id, 2);
});

test('revocation immediately after refresh returns to login without looping', async () => {
  let expired = 0,
    calls = 0;
  const client = new Client(
    'https://example.test',
    async () => {},
    () => {
      expired++;
    },
    (async (url: unknown) => {
      calls++;
      return String(url).endsWith('/refresh')
        ? result({ ...session, access_token: 'new' })
        : result({}, 401);
    }) as typeof fetch,
  );
  await client.replace(session);
  await assert.rejects(
    () => client.request('/private'),
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
  assert.equal(calls, 3);
  assert.equal(client.session, null);
  assert.equal(expired, 1);
});

test('account switch while parsing a response cannot return previous account data', async () => {
  let started: () => void = () => {},
    finish: (data: unknown) => void = () => {};
  const parsing = new Promise<void>((resolve) => {
    started = resolve;
  });
  const body = new Promise((resolve) => {
    finish = resolve;
  });
  const response = result({});
  response.json = async () => {
    started();
    return body;
  };
  const client = new Client(
    'https://example.test',
    async () => {},
    () => {},
    (async () => response) as typeof fetch,
  );
  await client.replace(session);
  const pending = client.request('/private');
  const rejected = assert.rejects(
    () => pending,
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
  await parsing;
  await client.replace({ ...session, user: { ...session.user, id: 2 } });
  finish({ secret: 'old-account' });
  await rejected;
});
