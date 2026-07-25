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

test('pet generator requires and accepts an uploaded image', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="me"]').click();
  await page.locator('.gen-btn').click();

  await expect(page.locator('#modalOverlay.open')).toBeVisible();
  await expect(page.getByTestId('pet-upload-input')).toHaveAttribute('type', 'file');

  await page.locator('#generatePetButton').click();
  await expect(page.locator('#toast')).toContainText('請先上傳一張照片');

  await page.getByTestId('pet-upload-input').setInputFiles({
    name: 'pet-source.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGP8//8/AwwwMDAwMDAAAAwgAQcD7E9RAAAAAElFTkSuQmCC',
      'base64',
    ),
  });
  await expect(page.locator('#petUploadBox')).toHaveClass(/has-image/);
  await expect(page.locator('#petUploadPreview')).toBeVisible();
  await expect(page.locator('#petUploadName')).toContainText('pet-source.png');

  await page.evaluate(() => {
    state.fragments = 142;
    renderTop();
  });
  await page.locator('#generatePetButton').click();
  await expect(page.locator('#screen-pet')).toHaveClass(/active/);
  await expect(page.locator('#petHolder svg')).toBeVisible();
  await expect(page.locator('#topFrag')).toHaveText('42');
});
