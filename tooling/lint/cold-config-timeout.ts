/**
 * The first lint in each spec file loads the real config cold (its plugins, through jiti): about
 * 3 s alone, longer while every lint spec's worker loads it at once.
 */
export const COLD_CONFIG_TIMEOUT = 15_000
