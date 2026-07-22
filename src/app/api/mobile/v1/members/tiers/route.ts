import { requireMobileAuth } from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

export async function GET(request: Request) {
  try {
    await requireMobileAuth(request);

    return mobileSuccess([
      { name: 'Bronze', minimumSpent: 0 },
      { name: 'Silver', minimumSpent: 1_000_000 },
      { name: 'Gold', minimumSpent: 2_500_000 },
      { name: 'Platinum', minimumSpent: 5_000_000 },
      { name: 'Diamond', minimumSpent: 10_000_000 },
    ]);
  } catch (error) {
    console.error('GET mobile member tiers error:', error);
    return mobileError('UNAUTHORIZED', 'Access token tidak valid.', 401);
  }
}
