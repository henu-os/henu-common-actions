#!/usr/bin/env node

/**
 * HENU Release Automation - Platform API Notifier
 * Delivers cryptographically signed webhook notifications to the HENU Platform API.
 */

const crypto = require('crypto');

function computeHmacSignature(payloadBuffer, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadBuffer);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * @param {Object} params
 * @param {string} params.endpointUrl
 * @param {string} params.webhookSecret
 * @param {string} [params.eventType]
 * @param {string} [params.action]
 * @param {string} [params.deliveryId]
 * @param {Object} [params.releasePayload]
 */
async function notifyPlatformApi({
  endpointUrl,
  webhookSecret,
  eventType = 'release',
  action = 'published',
  deliveryId = undefined,
  releasePayload = {},
}) {
  if (!endpointUrl) throw new Error('Missing Platform API endpoint URL');
  if (!webhookSecret) throw new Error('Missing Webhook Secret');

  const guid = deliveryId || crypto.randomUUID();
  const payloadObject = {
    action,
    ...releasePayload,
  };

  const payloadString = JSON.stringify(payloadObject);
  const payloadBuffer = Buffer.from(payloadString, 'utf8');
  const signature = computeHmacSignature(payloadBuffer, webhookSecret);

  const parsedUrl = new URL(endpointUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const httpLib = isHttps ? require('https') : require('http');

  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payloadBuffer.length,
      'X-GitHub-Event': eventType,
      'X-GitHub-Delivery': guid,
      'X-Hub-Signature-256': signature,
      'User-Agent': 'HENU-Release-Automation/1.0',
    },
  };

  return new Promise((resolve, reject) => {
    const req = httpLib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ statusCode: res.statusCode, data: body });
          }
        } else {
          reject(
            new Error(
              `Platform API responded with HTTP ${res.statusCode}: ${body || res.statusMessage}`,
            ),
          );
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payloadBuffer);
    req.end();
  });
}

// CLI entry point
if (require.main === module) {
  const endpoint = process.env.HENU_PLATFORM_API_URL;
  const secret = process.env.HENU_WEBHOOK_SECRET;
  const manifestFile = process.argv[2];

  if (!endpoint || !secret || !manifestFile) {
    console.error(
      'Usage: HENU_PLATFORM_API_URL=... HENU_WEBHOOK_SECRET=... node notify-platform.js <manifest.json>',
    );
    process.exit(1);
  }

  const fs = require('fs');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));

  notifyPlatformApi({
    endpointUrl: endpoint,
    webhookSecret: secret,
    releasePayload: {
      release: manifest,
      repository: {
        owner: { login: process.env.GITHUB_REPOSITORY_OWNER || 'henu-os' },
        name: process.env.GITHUB_REPOSITORY_NAME || manifest.productId,
      },
    },
  })
    .then((result) => {
      console.log(
        `[HENU Platform API] Release notification delivered successfully (HTTP ${result.statusCode}).`,
      );
    })
    .catch((err) => {
      console.error(`[HENU Platform API ERROR] ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  computeHmacSignature,
  notifyPlatformApi,
};
