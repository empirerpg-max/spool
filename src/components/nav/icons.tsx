import type { SVGProps } from 'react';

/** Line icons for the navigation, drawn on a 24px grid; `active` thickens the stroke. */
type IconProps = SVGProps<SVGSVGElement> & { active?: boolean };

function Svg({ active, children, className = 'size-6', ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8}
      strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3.5 10.5 12 3.5l8.5 7" /><path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9" /></Svg>
);

export const ExploreIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><path d="M12 8v8M8 12h8" /></Svg>
);

export const BellIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 9a6 6 0 1 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15.5 6 9" /><path d="M10.3 20.5a1.94 1.94 0 0 0 3.4 0" /></Svg>
);

export const UserIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></Svg>
);

export const SignInIcon = (p: IconProps) => (
  <Svg {...p}><path d="M14 4h4.5a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 8l4 4-4 4M14 12H4" /></Svg>
);

export const PenIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Svg>
);

export const ListAddIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 6h12M4 12h9M4 18h7" /><path d="M18 14v6M15 17h6" /></Svg>
);

export const GearIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);
