// Longer than the 120 ms debounce the kit shares between every inspector: vue-router's inspector
// sends on each navigation, and a send of ours inside that window is replaced by it.
export const stateRefreshDelayMs = 150
