import { describe, expect, it } from 'vitest'
import { preparationTransitionStatuses } from './kitchen-utils'

describe('preparationTransitionStatuses', () => {
  it('confirms a pending order before preparing it', () => {
    expect(preparationTransitionStatuses('PENDING')).toEqual(['CONFIRMED', 'PREPARING'])
    expect(preparationTransitionStatuses('pending')).toEqual(['CONFIRMED', 'PREPARING'])
  })

  it('moves an already confirmed order directly to preparing', () => {
    expect(preparationTransitionStatuses('CONFIRMED')).toEqual(['PREPARING'])
  })
})
