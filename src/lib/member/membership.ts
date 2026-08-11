export type MembershipTier =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond';

export type MembershipSummary = {
  tier: MembershipTier;
  totalSpent: number;
  minimumSpent: number;
  nextTier: MembershipTier | null;
  nextTierMinimum: number | null;
  remainingToNextTier: number;
  progress: number;
};

const TIER_THRESHOLDS = [
  {
    name: 'Bronze',
    minimum: 0,
  },
  {
    name: 'Silver',
    minimum: 1_000_000,
  },
  {
    name: 'Gold',
    minimum: 2_500_000,
  },
  {
    name: 'Platinum',
    minimum: 5_000_000,
  },
  {
    name: 'Diamond',
    minimum: 10_000_000,
  },
] as const;

export function getMembershipTier(
  rawTotalSpent: number,
): MembershipSummary {
  const totalSpent = Math.max(
    0,
    Number(rawTotalSpent) || 0,
  );

  let currentIndex = 0;

  for (
    let index = TIER_THRESHOLDS.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (
      totalSpent >=
      TIER_THRESHOLDS[index].minimum
    ) {
      currentIndex = index;
      break;
    }
  }

  const currentTier =
    TIER_THRESHOLDS[currentIndex];

  const nextTier =
    TIER_THRESHOLDS[currentIndex + 1] ??
    null;

  if (!nextTier) {
    return {
      tier: currentTier.name,
      totalSpent,
      minimumSpent: currentTier.minimum,
      nextTier: null,
      nextTierMinimum: null,
      remainingToNextTier: 0,
      progress: 100,
    };
  }

  const tierRange =
    nextTier.minimum -
    currentTier.minimum;

  const currentProgress =
    totalSpent -
    currentTier.minimum;

  const progress = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (currentProgress / tierRange) *
          100,
      ),
    ),
  );

  return {
    tier: currentTier.name,
    totalSpent,
    minimumSpent: currentTier.minimum,
    nextTier: nextTier.name,
    nextTierMinimum: nextTier.minimum,
    remainingToNextTier: Math.max(
      0,
      nextTier.minimum - totalSpent,
    ),
    progress,
  };
}