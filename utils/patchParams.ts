/**
 * patchParams — typed deep-merge utility for SynthParameters.
 *
 * Recursively merges `patch` into a shallow-cloned `base`, so callers
 * never need to manually spread every ancestor object. Plain arrays and
 * primitives in `patch` replace their counterparts in `base` directly.
 *
 * @example
 *   updateParams({ filter: { cutoff: 880 } });
 *   // instead of:
 *   setParams(p => ({ ...p, filter: { ...p.filter, cutoff: 880 } }));
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export function patchParams<T extends object>(base: T, patch: DeepPartial<T>): T {
  const result = { ...base } as T;
  for (const key in patch) {
    const patchVal = patch[key as keyof typeof patch];
    const baseVal = base[key as keyof T];
    if (
      patchVal !== null &&
      typeof patchVal === 'object' &&
      !Array.isArray(patchVal) &&
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      // Recurse one level
      (result as Record<string, unknown>)[key] = patchParams(
        baseVal as object,
        patchVal as DeepPartial<object>
      );
    } else if (patchVal !== undefined) {
      (result as Record<string, unknown>)[key] = patchVal;
    }
  }
  return result;
}
