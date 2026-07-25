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

test('nearby places falls back to client Google Places for GitHub Pages', async ({ page }) => {
  await page.route('**/api/nearby-places**', (route) => {
    route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
  });
  await page.goto('http://localhost:5173');
  const result = await page.evaluate(async () => {
    map = {};
    window.google = {
      maps: {
        LatLng: function LatLng(lat, lng) {
          return { lat, lng };
        },
        places: {
          PlacesServiceStatus: {
            OK: 'OK',
            ZERO_RESULTS: 'ZERO_RESULTS',
          },
          PlacesService: function PlacesService() {
            return {
              nearbySearch(_request, callback) {
                callback([
                  {
                    place_id: 'mock-place-1',
                    name: 'Mock Coffee',
                    vicinity: 'Mock Road 1',
                    geometry: {
                      location: {
                        lat: () => 24.18,
                        lng: () => 120.64,
                      },
                    },
                    types: ['cafe'],
                  },
                ], 'OK');
              },
            };
          },
        },
      },
    };
    return loadNearbyPlaces('cafe');
  });

  expect(result.provider).toBe('google');
  expect(result.places[0].name).toBe('Mock Coffee');
  expect(result.places[0].latitude).toBe(24.18);
});

test('online tab renders safe offline state before Firebase is configured', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();

  await expect(page.locator('#screen-online')).toHaveClass(/active/);
  await expect(page.locator('#onlineStatus')).toContainText('Firebase');
  await expect(page.locator('#authContent')).toContainText('Firebase');
  await expect(page.locator('#friendCodeBox')).toContainText('----');
  await expect(page.locator('#friendList')).toContainText('登入後');

  await page.locator('#shareLocationBtn').click();
  await expect(page.locator('#toast')).toContainText('請先登入');
});

test('online tab switches to signed-in UI when auth snapshot arrives', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.FootprintOnline = {
      updateLocation(payload) {
        window.receiveOnlineSnapshot({
          sharing: true,
          lastSharedAt: payload.updatedAt,
        });
      },
      stopSharing() {},
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'test-user',
        displayName: '測試玩家',
        email: 'test@example.com',
      },
      friendCode: 'ABC12345',
      friends: [],
      party: null,
      sharing: false,
    });
  });

  await expect(page.locator('#authContent')).toContainText('測試玩家');
  await expect(page.locator('#authContent')).not.toContainText('使用 Google 登入');
  await expect(page.locator('#friendCodeBox')).toContainText('ABC12345');

  await page.locator('#shareLocationBtn').click();
  await expect(page.locator('#sharingText')).toContainText('分享中');
});

test('profile tab prompts before login and lets signed-in users change display name', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="me"]').click();

  await expect(page.locator('#profileName')).toHaveText('請先登入');
  await expect(page.locator('#profileMeta')).toContainText('登入後');
  await expect(page.locator('#profileEdit')).toContainText('前往登入');

  await page.evaluate(() => {
    window.FootprintOnline = {
      updateDisplayName(displayName) {
        window.receiveOnlineSnapshot({
          user: {
            uid: 'test-user',
            displayName,
            email: 'test@example.com',
          },
        });
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'test-user',
        displayName: '城市玩家',
        email: 'test@example.com',
      },
      friendCode: 'ABC12345',
      friends: [],
      party: null,
      partyInvites: [],
      sharing: false,
    });
  });

  await expect(page.locator('#profileName')).toHaveText('城市玩家');
  await page.locator('#profileNameInput').fill('阿曼');
  await page.getByRole('button', { name: '儲存使用者名稱' }).click();
  await expect(page.locator('#profileName')).toHaveText('阿曼');
});

test('friend code input is readable on mobile and party invite can be accepted', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.joinedParty = '';
    window.FootprintOnline = {
      joinParty(partyId) {
        window.joinedParty = partyId;
        window.receiveOnlineSnapshot({
          partyInvites: [],
          party: {
            id: partyId,
            goal: '一起散步',
            members: {
              host: { displayName: '好友A' },
              me: { displayName: '城市玩家' },
            },
          },
        });
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'test-user',
        displayName: '城市玩家',
        email: 'test@example.com',
      },
      friendCode: 'ABC12345',
      friends: [],
      party: null,
      partyInvites: [
        {
          partyId: 'party-1',
          hostName: '好友A',
          goal: '一起散步',
          createdAt: Date.now(),
        },
      ],
      sharing: false,
    });
  });

  const inputMetrics = await page.locator('#friendCodeInput').evaluate((input) => {
    const box = input.getBoundingClientRect();
    const style = window.getComputedStyle(input);
    return { width: box.width, fontSize: Number.parseFloat(style.fontSize) };
  });
  expect(inputMetrics.width).toBeGreaterThan(170);
  expect(inputMetrics.fontSize).toBeGreaterThanOrEqual(16);

  await expect(page.locator('#partyStatus')).toContainText('好友A 邀請你散步');
  await page.locator('#partyStatus button').click();
  await expect(page.locator('#partyStatus')).toContainText('小隊進行中');
  await expect(page.locator('#partyStatus')).toContainText('城市玩家');
  await expect.poll(() => page.evaluate(() => window.joinedParty)).toBe('party-1');
});
