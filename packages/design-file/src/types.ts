// The bundle's files as KDL texts, as storage hands them over; a file it does not have is absent.
export interface RawBundle {
  design?: string
  routing?: string
  fingerprints?: string
}
