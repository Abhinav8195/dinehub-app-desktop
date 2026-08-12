export function preparationTransitionStatuses(currentStatus: string) {
  return currentStatus.toLowerCase() === 'pending'
    ? ['CONFIRMED', 'PREPARING']
    : ['PREPARING']
}
