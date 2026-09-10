import LandingPageClient from '@/app/_components/landing/LandingPageClient';
import MaintenanceView from '@/app/_components/maintenance/MaintenanceView';

/*
 * Landing page reads MAINTENANCE_MODE on the server.
 * force-dynamic prevents the result from being permanently statically cached.
 */
export const dynamic = 'force-dynamic';

function maintenanceModeEnabled(): boolean {
  const value = (process.env.MAINTENANCE_MODE ?? 'false')
    .trim()
    .toLowerCase();

  return ['true', '1', 'yes', 'on'].includes(value);
}

export default function HomePage() {
  if (maintenanceModeEnabled()) {
    return <MaintenanceView />;
  }

  return <LandingPageClient />;
}
