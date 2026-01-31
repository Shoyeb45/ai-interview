import type { HiringDecision } from '@/types/schema';

export function getDecisionColor(decision: HiringDecision): string {
  switch (decision) {
    case 'STRONG_HIRE':
      return 'bg-green-100 text-green-800';
    case 'HIRE':
      return 'bg-green-50 text-green-700';
    case 'BORDERLINE':
      return 'bg-yellow-100 text-yellow-800';
    case 'NO_HIRE':
      return 'bg-red-50 text-red-700';
    case 'STRONG_NO_HIRE':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
