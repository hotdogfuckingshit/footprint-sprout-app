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

test('blind quest planner starts hidden route and validates a city photo', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await expect(page.locator('#questCard')).toContainText('空堂盲盒探索');
  await page.locator('#questTime').selectOption('40 分鐘');
  await page.locator('#questTheme').selectOption('城市色彩');
  await page.getByRole('button', { name: '開始盲盒路線' }).click();

  await expect(page.locator('#questCard')).toContainText('盲盒路線進行中');
  await expect(page.locator('#questCard')).toContainText('上傳任務照片驗證');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <rect width="120" height="120" fill="#1b7f5a"/>
      <rect x="8" y="8" width="44" height="44" fill="#ffc93c"/>
      <rect x="64" y="12" width="44" height="92" fill="#ff6b5b"/>
      <path d="M0 110 L120 10" stroke="#1c2541" stroke-width="12"/>
      <circle cx="36" cy="84" r="18" fill="#eaf6ff"/>
    </svg>`;
  await page.locator('#questPhotoInput').setInputFiles({
    name: 'city-detail.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svg),
  });

  await expect(page.locator('#questCard')).toContainText('照片任務通過');
  await expect(page.locator('#questCard')).toContainText('解鎖下一段線索');
});

test('blind quest can be completed and creates weekly review', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await page.getByRole('button', { name: '開始盲盒路線' }).click();
  await page.getByRole('button', { name: '安全略過' }).click();
  await page.getByRole('button', { name: '解鎖下一段線索' }).click();
  await page.getByRole('button', { name: '安全略過' }).click();
  await page.getByRole('button', { name: '完成並生成回顧' }).click();

  await expect(page.locator('#questCard')).toContainText('本次旅程已完成');
  await page.locator('.navbtn[data-tab="me"]').click();
  await expect(page.locator('#reviewList')).toContainText('本週城市回顧');
  await expect(page.locator('#reviewList')).toContainText('任務');
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

test('quick login prompts for a display name when Firebase is configured', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.FOOTPRINT_FIREBASE_CONFIG = {
      apiKey: 'test-key',
      authDomain: 'test.firebaseapp.com',
      databaseURL: 'https://test.firebaseio.com',
      projectId: 'test',
      appId: 'test-app',
    };
    window.quickLoginName = '';
    window.FootprintOnline = {
      quickSignIn(displayName) {
        window.quickLoginName = displayName;
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-out',
      user: null,
      friendCode: '',
      friends: [],
      party: null,
      partyInvites: [],
      sharing: false,
    });
  });
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('輸入使用者名稱');
    await dialog.accept('阿曼');
  });
  await page.getByRole('button', { name: '快速登入' }).click();
  await expect.poll(() => page.evaluate(() => window.quickLoginName)).toBe('阿曼');
});

test('online tab switches to signed-in UI when auth snapshot arrives', async ({ page }) => {
  await page.context().grantPermissions(['geolocation'], { origin: 'http://localhost:5173' });
  await page.context().setGeolocation({ latitude: 24.1815, longitude: 120.6449 });
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.FootprintOnline = {
      updateLocation(payload) {
        window.receiveOnlineSnapshot({
          sharing: true,
          myLocation: {
            lat: payload.lat,
            lng: payload.lng,
            updatedAt: payload.updatedAt,
          },
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
      partyInvites: [],
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

test('friend distance only appears after both sides share locations', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'me',
        displayName: '城市玩家',
        email: 'me@example.com',
      },
      friendCode: 'ABC12345',
      friends: [
        {
          uid: 'friend-1',
          displayName: '好友A',
          location: {
            lat: 24.182,
            lng: 120.645,
            updatedAt: Date.now(),
          },
        },
      ],
      party: null,
      partyInvites: [],
      sharing: false,
      myLocation: null,
    });
  });

  await expect(page.locator('#friendList')).toContainText('待你分享');

  await page.evaluate(() => {
    window.receiveOnlineSnapshot({
      sharing: true,
      myLocation: {
        lat: 24.1815,
        lng: 120.6449,
        updatedAt: Date.now(),
      },
    });
  });

  await expect(page.locator('#friendList')).toContainText('57 m');
});

test('walk party creation sends invites only to checked friends and does not overwrite an active party', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.createdInvites = null;
    window.FootprintOnline = {
      createParty(inviteUids) {
        window.createdInvites = inviteUids;
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'me',
        displayName: '城市玩家',
        email: 'me@example.com',
      },
      friendCode: 'ABC12345',
      friends: [
        { uid: 'friend-a', displayName: '好友A' },
        { uid: 'friend-b', displayName: '好友B' },
      ],
      party: null,
      partyInvites: [],
      sharing: false,
    });
  });

  await expect(page.locator('#partyInvitePicker')).toContainText('選擇要邀請的好友');
  await page.locator('#partyInvitePicker input').nth(1).uncheck();
  await page.getByRole('button', { name: '建立小隊' }).click();
  await expect.poll(() => page.evaluate(() => window.createdInvites)).toEqual(['friend-a']);

  await page.evaluate(() => {
    window.createdInvites = null;
    window.receiveOnlineSnapshot({
      party: {
        id: 'existing-party',
        hostUid: 'friend-a',
        goal: '一起散步',
        members: {
          'friend-a': { displayName: '好友A' },
          me: { displayName: '城市玩家' },
        },
      },
    });
  });

  await page.getByRole('button', { name: '建立小隊' }).click();
  await expect(page.locator('#toast')).toContainText('你已在小隊中');
  await expect.poll(() => page.evaluate(() => window.createdInvites)).toBeNull();
});

test('map double click enters fullscreen and does not exit while zooming', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('#mapWrap').dblclick();
  await expect(page.locator('#mapWrap')).toHaveClass(/map-fullscreen/);
  await page.locator('#mapWrap').dblclick();
  await expect(page.locator('#mapWrap')).toHaveClass(/map-fullscreen/);
  await page.locator('.map-exit-btn').click();
  await expect(page.locator('#mapWrap')).not.toHaveClass(/map-fullscreen/);
});
