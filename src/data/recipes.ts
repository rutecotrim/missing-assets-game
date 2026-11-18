import type { Recipe } from '../core/types';

/**
 * Combination recipes. Order doesn't matter (a+b == b+a).
 * Players discover them by dragging one inventory item onto another.
 */
export const RECIPES: Recipe[] = [
  {
    a: 'tape',
    b: 'torn_flow',
    gives: 'user_flow',
    say: 'You line up the jagged edges and tape the user flow back together. Beautiful. Almost looks intentional.',
  },
  {
    a: 'stress_ball',
    b: 'rubber_duck',
    gives: 'squeezy_duck',
    optional: true,
    say: 'You press the duck into the stress ball. It squeaks. You have created something nobody asked for.',
  },
];
