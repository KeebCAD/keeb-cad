import type { Meta, Node, PlacementId } from '@keeb-cad/schema'
import {
  aDesign,
  aGap,
  aLayout,
  aLength,
  aMeta,
  anId,
  aPlacementId,
  aSlot,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Selection } from '../../../selection/selection'
import { mountShell } from '../../../testing/mount-shell'

const inspector = () => page.getByRole('complementary', { name: 'Inspector' })
const settings = () => inspector().getByRole('region', { name: 'Design settings' })
const field = (name: string) => settings().getByRole('combobox', { name })

async function arrange({ meta = aMeta(), children = [], selected = [] }: Arrangement) {
  const design = aDesign({ meta, layout: aLayout({ id: anId('root'), children }) })
  const shell = await mountShell({ path: '/design/corne/layout', design })
  shell.injector.resolve(Selection).select(selected)
}

type Arrangement = { meta?: Meta; children?: Node[]; selected?: readonly PlacementId[] }

describe('Design settings in the Layout inspector', () => {
  it('shows gap x and gap y with what the design holds while nothing is selected', async () => {
    await arrange({ meta: aMeta({ gap: aGap({ x: aLength('2mm'), y: aLength('3mm') }) }) })

    await expect.element(field('gap x')).toHaveValue('2mm')
    await expect.element(field('gap y')).toHaveValue('3mm')
  })

  it('is not shown while a slot is selected', async () => {
    await arrange({ children: [aSlot({ id: anId('a') })], selected: [aPlacementId('left/a')] })

    await expect.element(settings()).not.toBeInTheDocument()
  })
})
