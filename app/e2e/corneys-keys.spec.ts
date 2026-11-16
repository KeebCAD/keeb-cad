import { expect } from '@playwright/test'

import { drawnKeys } from './canvas/drawn-keys'
import { CORNEY_KEYS, CORNEY_LEFT_KEYS, CORNEY_RIGHT_KEYS } from './corney-bundle/corney-keys'
import { test } from './corney-bundle/corney-test'
import {
  newestStoredDesignText,
  storedDesignCount,
  storeVersion,
} from './stored-versions/stored-versions'

const ADDED_ID = 'added-key'
const ADDED_LEFT = `left/${ADDED_ID}`
const ADDED_RIGHT = `right/${ADDED_ID}`

test("reopens Corney's design, adds and deletes a key, and keeps the deletion after a reload", async ({
  page,
  corney,
}) => {
  const canvas = page.getByRole('main', { name: 'Canvas' })
  const corneyUrl = `/#/design/${corney.label.id}/layout`

  await page.goto('/')
  await expect.poll(() => page.evaluate(storedDesignCount)).toBe(1)
  await page.evaluate(storeVersion, corney)
  await page.goto('about:blank')
  await page.goto(corneyUrl)

  await expect(page).toHaveURL(corneyUrl)
  await expect.poll(() => drawnKeys(page)).toEqual(CORNEY_KEYS)

  await canvas.focus()
  await page.keyboard.press('s')
  await page.getByRole('dialog').getByRole('textbox', { name: 'Id' }).fill(ADDED_ID)
  await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click()
  // The pointer left on the canvas where Add was would show the hovered group's tab.
  await page.mouse.move(0, 0)

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect
    .poll(() => drawnKeys(page))
    .toEqual([ADDED_LEFT, ...CORNEY_LEFT_KEYS, ADDED_RIGHT, ...CORNEY_RIGHT_KEYS])
  await expect(canvas.getByRole('button', { name: ADDED_LEFT, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await expect
    .poll(() => page.evaluate(newestStoredDesignText, corney.label.id))
    .toContain(ADDED_ID)
  await canvas.focus()
  await page.keyboard.press('Delete')

  await expect.poll(() => drawnKeys(page)).toEqual(CORNEY_KEYS)

  await expect
    .poll(() => page.evaluate(newestStoredDesignText, corney.label.id))
    .not.toContain(ADDED_ID)
  await page.reload()

  await expect(page).toHaveURL(corneyUrl)
  await expect.poll(() => drawnKeys(page)).toEqual(CORNEY_KEYS)
})
