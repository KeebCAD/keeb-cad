import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Override, Rejection } from '@keeb-cad/schema'

import { reject } from '../reject/reject'
import { overrideNotAllowedMessage } from '../violations/override-not-allowed-message'
import { unknownOverrideTargetMessage } from '../violations/unknown-override-target-message'
import { resolvesToSlot } from './override-target'
import { isRefusedSwap } from './refused-swap'

// The target first: a swap on a slot the design lacks is an unknown target, not a refused swap.
export function checkSetOverride(
  design: Frozen<Design>,
  override: Frozen<Override>,
): Result<void, Rejection> {
  const ids = [override.target]
  if (!resolvesToSlot(design.layout, override.target)) {
    return Result.err(reject('unknown-target', ids, unknownOverrideTargetMessage(ids)))
  }
  if (isRefusedSwap(override, design.meta.form)) {
    return Result.err(reject('override-not-allowed', ids, overrideNotAllowedMessage(ids)))
  }
  return Result.ok()
}
