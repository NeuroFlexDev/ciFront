import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import MarkdownContent from '@/Components/MarkdownContent';

afterEach(cleanup);

it('renders Russian and English lessons with accessible math and GFM tables',()=>{
  const {container}=render(<MarkdownContent>{String.raw`# Теорема / Theorem

$$\int_0^1 x^2\,dx = \frac{1}{3}$$

| Величина / Value | Результат / Result |
| --- | --- |
| x | 2 |
`}</MarkdownContent>);
  expect(screen.getByRole('heading',{name:'Теорема / Theorem'})).toBeInTheDocument();
  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(container.querySelector('math')).not.toBeNull();
  expect(container.querySelector('.katex-error')).toBeNull();
});

it('does not turn raw HTML or trusted TeX commands into active scripts or remote images',()=>{
  const {container}=render(<MarkdownContent>{String.raw`<script>alert(1)</script>

$\includegraphics{https://example.invalid/tracking.png}$

$\href{javascript:alert(1)}{click}$
`}</MarkdownContent>);
  expect(container.querySelector('script,img,a[href^="javascript:"]')).toBeNull();
});
