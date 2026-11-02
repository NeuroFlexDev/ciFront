import { expect, it } from 'vitest';
import appSource from './App.tsx?raw';
import nginxConfig from '../nginx.conf?raw';

it('serves every declared app route on a direct request or refresh', () => {
  const pattern = nginxConfig.match(/location ~ (\^\/\([^\n]+?) \{/);
  expect(pattern, 'The platform must have an explicit SPA route allowlist').not.toBeNull();
  const allowed = new RegExp(pattern![1]);
  const paths = Array.from(appSource.matchAll(/<Route\s+path=['"]([^'"]+)['"]/g))
    .map(match => match[1])
    .filter(path => path !== '/' && path !== '*');
  expect(paths.length).toBeGreaterThan(20);
  for (const path of paths) {
    const example = path.replace(/:[A-Za-z]+/g, '123');
    expect(allowed.test(example), `Direct request to ${example} would return 404`).toBe(true);
  }
  expect(allowed.test('/unknown-page')).toBe(false);
  expect(allowed.test('/assets/missing.js')).toBe(false);
});
