import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import WebSearchStatus from './WebSearchStatus';

afterEach(cleanup);

it('renders preserved citations and drops unsafe links without treating the result as HTML', () => {
  render(<WebSearchStatus evidence={{status:'completed', sources:[
    {url:'https://www.nasa.gov/science/',title:'NASA science'},
    {url:'https://www.nasa.gov/science/',title:'NASA science duplicate'},
    {url:'javascript:alert(1)',title:'Invalid'},
    {url:'https://user:secret@example.com/',title:'Credential URL'},
  ],queries:['<script>topic</script>']}} />);
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link',{name:/NASA science/})).toHaveAttribute('href','https://www.nasa.gov/science/');
  expect(screen.getByText('<script>topic</script>')).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
});

it('reports unavailable search honestly instead of displaying invented sources', () => {
  render(<WebSearchStatus evidence={{status:'unavailable',warning:'Поиск временно недоступен'}} />);
  expect(screen.getByRole('heading',{name:'Поиск в интернете недоступен'})).toBeInTheDocument();
  expect(screen.getByText('Поиск временно недоступен')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
