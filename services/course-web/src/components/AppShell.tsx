import { useEffect, useState } from 'react';
import {
  Badge,
  FluentProvider,
  Switch,
  Tab,
  TabList,
  Text,
  Toolbar,
} from '@fluentui/react-components';
import {
  BookRegular,
  GridRegular,
  WeatherMoonRegular,
} from '@fluentui/react-icons';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { darkTheme, lightTheme } from '../theme';
import '../styles.css';

type Appearance = 'light' | 'dark';
const appearanceKey = 'course-studio-appearance';

function readSavedAppearance(): Appearance | null {
  const saved = window.localStorage.getItem(appearanceKey);
  return saved === 'light' || saved === 'dark' ? saved : null;
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [savedAppearance, setSavedAppearance] = useState<Appearance | null>(readSavedAppearance);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const appearance = savedAppearance ?? (systemDark ? 'dark' : 'light');
  const activeRoute = location.pathname.startsWith('/courses/') ? 'workspace' : 'library';

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = appearance;
    document.documentElement.style.colorScheme = appearance;
  }, [appearance]);

  function handleAppearanceChange(checked: boolean): void {
    const nextAppearance = checked ? 'dark' : 'light';
    window.localStorage.setItem(appearanceKey, nextAppearance);
    setSavedAppearance(nextAppearance);
  }

  return (
    <FluentProvider
      className="course-app-provider"
      theme={appearance === 'dark' ? darkTheme : lightTheme}
      data-theme={appearance}
    >
      <div className="app-frame">
        <header className="app-header">
          <Toolbar className="app-toolbar" aria-label="Course Studio header">
            <Link to="/" className="brand-lockup" aria-label="Course Studio home">
              <span className="brand-mark" aria-hidden="true">CS</span>
              <Text weight="semibold">Course Studio</Text>
            </Link>
            <div className="header-actions">
              <Badge appearance="tint" color="success" className="local-badge">Local workspace</Badge>
              <Switch
                checked={appearance === 'dark'}
                label="Dark appearance"
                onChange={(_, data) => handleAppearanceChange(data.checked)}
              />
              <WeatherMoonRegular className="appearance-icon" aria-hidden="true" />
            </div>
          </Toolbar>
        </header>

        <nav className="primary-nav" aria-label="Primary navigation">
          <TabList
            selectedValue={activeRoute}
            onTabSelect={(_, data) => navigate(data.value === 'workspace' ? '/courses/calculus-101' : '/')}
          >
            <Tab value="library" icon={<GridRegular />}>Course Library</Tab>
            <Tab value="workspace" icon={<BookRegular />}>Course Workspace</Tab>
          </TabList>
        </nav>

        <main className="page-main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="route-content"
              key={location.pathname}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="app-footer">
          <span>Course Studio</span>
          <span>Generated course content remains a draft until reviewed.</span>
        </footer>
      </div>
    </FluentProvider>
  );
}
