import PublicPortalClient from '@/components/PublicPortalClient';
import { getPublicSettingsAndStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Responsive classes for mobile and desktop design: sm: md: fixed bottom-0

export default async function Page() {
  const initialData = await getPublicSettingsAndStats().catch(err => {
    console.error('Error fetching initial settings on server:', err);
    return null;
  });

  return (
    <PublicPortalClient 
      initialSettings={initialData?.settings || null} 
      initialStats={initialData?.stats || null} 
    />
  );
}
