import http from 'http';
import { computeHmacSignature, notifyPlatformApi } from '../scripts/notify-platform';

describe('Platform API Notification & HMAC Signing', () => {
  it('computes valid HMAC-SHA256 signature with sha256= prefix', () => {
    const payload = Buffer.from('{"action":"published"}');
    const secret = 'test-webhook-secret-key-12345';
    const sig = computeHmacSignature(payload, secret);

    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);

    // Compute expected
    const crypto = require('crypto');
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(sig).toBe(expected);
  });

  it('delivers signed webhook payload to HTTP server with expected headers', async () => {
    let capturedHeaders: any = null;
    let capturedBody = '';

    const server = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      req.on('data', (chunk) => (capturedBody += chunk));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({ status: 'acknowledged', deliveryId: req.headers['x-github-delivery'] }),
        );
      });
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const secret = 'super-secret-hmac-key';
    const releasePayload = {
      productId: 'henu-pa',
      version: '1.0.0',
      action: 'published',
    };

    const result = await notifyPlatformApi({
      endpointUrl: `http://localhost:${port}/webhooks/github`,
      webhookSecret: secret,
      deliveryId: 'test-delivery-guid-1234',
      releasePayload,
    });

    server.close();

    expect(result.statusCode).toBe(200);
    expect(capturedHeaders['x-github-event']).toBe('release');
    expect(capturedHeaders['x-github-delivery']).toBe('test-delivery-guid-1234');
    expect(capturedHeaders['x-hub-signature-256']).toMatch(/^sha256=[a-f0-9]{64}$/);

    const parsedBody = JSON.parse(capturedBody);
    expect(parsedBody.productId).toBe('henu-pa');
  });

  it('rejects if platform API returns 401 or error status', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized HMAC signature' }));
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    await expect(
      notifyPlatformApi({
        endpointUrl: `http://localhost:${port}/webhooks/github`,
        webhookSecret: 'invalid-secret',
        releasePayload: {},
      }),
    ).rejects.toThrow('Platform API responded with HTTP 401');

    server.close();
  });
});
