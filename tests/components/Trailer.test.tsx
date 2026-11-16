import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Trailer } from '@/components/work/Trailer';

describe('Trailer', () => {
  it('renders nothing without a key', () => {
    const { container } = render(<Trailer youtubeKey={null} title="Matrix" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('loads nothing from YouTube until clicked', () => {
    const { container } = render(<Trailer youtubeKey="abc" title="Matrix" />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://i.ytimg.com/vi/abc/hqdefault.jpg');
    fireEvent.click(screen.getByRole('button', { name: '▶ Trailer de Matrix' }));
    const iframe = container.querySelector('iframe')!;
    expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc?autoplay=1');
    expect(iframe).toHaveAttribute('title', 'Trailer de Matrix');
  });
});
