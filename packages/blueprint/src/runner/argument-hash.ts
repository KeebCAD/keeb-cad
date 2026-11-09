import { hash } from '@keeb-cad/hashing'

export function argumentHash(canonical: unknown): string {
  return hash(canonical)
}
