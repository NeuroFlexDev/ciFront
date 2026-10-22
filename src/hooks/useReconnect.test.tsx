import {useLayoutEffect} from 'react';
import {cleanup, render} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {useReconnect} from './useReconnect';
afterEach(cleanup);
it('uses the committed retry state when renewal arrives before passive effects', () => {
  const retry = vi.fn();
  function Reader({failed}: {failed: boolean}) {
    useReconnect(() => {if (failed) retry();});
    useLayoutEffect(() => {
      if (failed) window.dispatchEvent(new Event('lernium-session-renewed'));
    }, [failed]);
    return <span>{failed ? 'Retry available' : 'Loading'}</span>;
  }
  const view = render(<Reader failed={false} />);
  view.rerender(<Reader failed />);
  expect(retry).toHaveBeenCalledTimes(1);
  view.unmount();
  window.dispatchEvent(new Event('lernium-session-renewed'));
  expect(retry).toHaveBeenCalledTimes(1);
});
