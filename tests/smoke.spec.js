import { expect, test } from '@playwright/test';

test('html-first mobile app opens map list, detail sheet, pet and collection tabs', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await expect(page.locator('.phone')).toBeVisible();
  await expect(page.locator('#screen-map')).toHaveClass(/active/);
  await expect(page.locator('#locList .loc-card').first()).toBeVisible();

  await page.locator('#locList .loc-card').first().click();
  await expect(page.locator('.sheet.open')).toBeVisible();
  await expect(page.locator('.sheet h2')).toBeVisible();
  await page.locator('.close-x').click();

  await page.locator('.navbtn[data-tab="pet"]').click();
  await expect(page.locator('#screen-pet')).toHaveClass(/active/);
  await expect(page.locator('#petHolder svg')).toBeVisible();

  await page.locator('.navbtn[data-tab="book"]').click();
  await expect(page.locator('#screen-book')).toHaveClass(/active/);
  await expect(page.locator('#galGrid .gcard').first()).toBeVisible();
});
