import type { Fragment, Relation } from '@sui-note/domain';
import type { AppState } from '../app-state.js';

export function expandRelations(
  state: AppState,
  fragments: Fragment[],
): Relation[] {
  return fragments.flatMap((fragment) => state.relationsBySourceId.get(fragment.fragmentId) ?? []);
}
