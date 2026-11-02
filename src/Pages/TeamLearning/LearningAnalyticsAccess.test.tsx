import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LearningAnalytics from './LearningAnalytics';
const read = vi.hoisted(() => vi.fn());
vi.mock('../Learning/useLearningData', () => ({ useLearningData: read }));

describe('management analytics access', () => {
  it('shows a clear access screen without loading reports for a learner', () => {
    read.mockReturnValue({
      data: { can_report: false },
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(
      <MemoryRouter>
        <LearningAnalytics />
      </MemoryRouter>,
    );
    expect(screen.getByText('Этот раздел доступен руководителям')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /В рабочее пространство/ })).toBeInTheDocument();
    expect(read.mock.calls.every(([path]) => path === '/team/permissions')).toBe(true);
    expect(screen.queryByText('Назначений с такими условиями нет')).not.toBeInTheDocument();
  });
});
