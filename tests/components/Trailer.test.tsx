import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Trailer } from '@/components/work/Trailer';

describe('Trailer', () => {
  it('renders nothing without a key', () => {
    const { container } = render(<Trailer youtubeKey={null} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('embeds YouTube nocookie player', () => {
    const { container } = render(<Trailer youtubeKey="abc" />);
    const iframe = container.querySelector('iframe')!;
    expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc');
    expect(iframe).toHaveAttribute('title', 'Trailer');
    expect(iframe).toHaveAttribute('loading', 'lazy');
  });
});
