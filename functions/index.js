const { onValueCreated } = require('firebase-functions/v2/database');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();

const APP_URL = process.env.APP_URL || 'https://hotdogfuckingshit.github.io/footprint-sprout-app/';
const ICON_URL = `${APP_URL.replace(/\/$/, '')}/app-icon.svg`;

function appLink(params = {}) {
  const url = new URL(APP_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function tokensForUser(uid) {
  const snap = await admin.database().ref(`pushTokens/${uid}`).get();
  const tokens = [];
  snap.forEach((child) => {
    const token = child.val()?.token;
    if (token) tokens.push({ key: child.key, token });
  });
  return tokens;
}

async function pruneInvalidTokens(uid, tokenRows, responses) {
  const updates = {};
  responses.forEach((response, index) => {
    if (response.success) return;
    const code = response.error?.code || '';
    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
      updates[`pushTokens/${uid}/${tokenRows[index].key}`] = null;
    }
  });
  if (Object.keys(updates).length) await admin.database().ref().update(updates);
}

async function sendUserPush(uid, message) {
  const tokenRows = await tokensForUser(uid);
  if (!tokenRows.length) {
    logger.info('No push tokens for user', { uid, type: message.data?.type });
    return;
  }
  const response = await admin.messaging().sendEachForMulticast({
    tokens: tokenRows.map((row) => row.token),
    notification: {
      title: message.title,
      body: message.body,
    },
    data: {
      title: message.title,
      body: message.body,
      url: message.url,
      type: message.data?.type || 'online',
      partyId: message.data?.partyId || '',
      friend: message.data?.friend || '',
    },
    webpush: {
      fcmOptions: {
        link: message.url,
      },
      notification: {
        icon: ICON_URL,
        badge: ICON_URL,
        tag: message.tag || 'footprint-online',
        renotify: true,
      },
    },
  });
  await pruneInvalidTokens(uid, tokenRows, response.responses);
  logger.info('Push sent', {
    uid,
    type: message.data?.type,
    success: response.successCount,
    failure: response.failureCount,
  });
}

exports.notifyPartyInvite = onValueCreated('/partyInvites/{uid}/{partyId}', async (event) => {
  const uid = event.params.uid;
  const partyId = event.params.partyId;
  const invite = event.data.val() || {};
  const hostName = invite.hostName || '好友';
  await sendUserPush(uid, {
    title: '散步小隊邀請',
    body: `${hostName} 邀請你加入散步小隊`,
    url: appLink({ tab: 'online', action: 'joinParty', partyId }),
    tag: `party-${partyId}`,
    data: { type: 'partyInvite', partyId },
  });
});

exports.notifyLocationShareRequest = onValueCreated('/locationShares/{viewerUid}/{ownerUid}', async (event) => {
  const viewerUid = event.params.viewerUid;
  const ownerUid = event.params.ownerUid;
  const share = event.data.val() || {};
  const reciprocal = await admin.database().ref(`locationShares/${ownerUid}/${viewerUid}`).get();
  if (reciprocal.exists()) {
    logger.info('Location share already reciprocal, skip push', { viewerUid, ownerUid });
    return;
  }
  const ownerName = share.ownerName || '好友';
  await sendUserPush(viewerUid, {
    title: '好友分享了位置',
    body: `${ownerName} 分享了位置，點一下回分享你的定位`,
    url: appLink({ tab: 'online', action: 'shareBack', friend: ownerUid }),
    tag: `share-${ownerUid}`,
    data: { type: 'locationShare', friend: ownerUid },
  });
});
