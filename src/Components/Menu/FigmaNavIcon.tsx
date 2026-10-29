import type { CSSProperties } from 'react';
import overview from '@/assets/figma/mobile-overview.svg';
import courses from '@/assets/figma/mobile-courses.svg';
import team from '@/assets/figma/mobile-team.svg';
import results from '@/assets/figma/mobile-results.svg';
import notifications from '@/assets/figma/mobile-notifications.svg';
import profile from '@/assets/figma/mobile-profile.svg';
import menu from '@/assets/figma/mobile-menu.svg';
import styles from './mobileNavigation.module.css';

const icons = { overview, courses, team, results, notifications, profile, menu };
export type NavigationIcon = keyof typeof icons;

export default function FigmaNavIcon({ name }: { name: NavigationIcon }) {
  return (
    <span
      aria-hidden='true'
      className={styles.icon}
      style={{ '--nav-icon': `url("${icons[name]}")` } as CSSProperties}
    />
  );
}
