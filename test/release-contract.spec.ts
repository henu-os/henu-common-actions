import fs from 'fs';
import path from 'path';
import { validateReleaseContract } from '../scripts/validate-release-contract';

const validPa = require('./fixtures/valid-henu-pa-release.json');
const validAi = require('./fixtures/valid-henu-ai-release.json');
const validIde = require('./fixtures/valid-henu-ide-release.json');
const invalidContract = require('./fixtures/invalid-contract.json');

describe('Release Contract Validation', () => {
  it('validates HENU PA production release contract successfully', async () => {
    const result = await validateReleaseContract(validPa, { gitTag: 'v1.0.0' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates HENU AI release contract successfully', async () => {
    const result = await validateReleaseContract(validAi, { gitTag: 'v2.4.0' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates HENU IDE release contract successfully', async () => {
    const result = await validateReleaseContract(validIde, { gitTag: 'v3.1.2' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invalid contract with schema violations', async () => {
    const result = await validateReleaseContract(invalidContract);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e: string) => e.includes('productId'))).toBe(true);
    expect(result.errors.some((e: string) => e.includes('version'))).toBe(true);
  });

  it('fails if git tag does not match contract version', async () => {
    const result = await validateReleaseContract(validPa, { gitTag: 'v2.0.0' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("Git tag 'v2.0.0' does not match"))).toBe(
      true,
    );
  });

  it('fails if pre-release version is assigned to stable channel', async () => {
    const badContract = {
      ...validPa,
      version: '1.1.0-beta.1',
      channel: 'stable',
    };
    const result = await validateReleaseContract(badContract);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e: string) =>
        e.includes("Pre-release version '1.1.0-beta.1' cannot be published to 'stable'"),
      ),
    ).toBe(true);
  });

  it('verifies on-disk asset files, sizes, and SHA-256 digests accurately', async () => {
    // Create temporary test directory with actual file
    const tmpDir = path.join(__dirname, 'tmp-assets-test');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const fileName = 'test-asset.msi';
    const filePath = path.join(tmpDir, fileName);
    const content = 'HENU PA MSI BINARY CONTENT TEST';
    fs.writeFileSync(filePath, content);

    // crypto sha256 of content
    const crypto = require('crypto');
    const expectedHash = crypto.createHash('sha256').update(content).digest('hex');

    const contract = {
      productId: 'henu-pa',
      version: '1.0.0',
      channel: 'stable',
      releaseNotes: 'Testing asset verification on disk.',
      assets: [
        {
          fileName,
          os: 'windows',
          arch: 'x86_64',
          packageFormat: 'msi',
          sha256: expectedHash,
          sizeBytes: Buffer.byteLength(content),
        },
      ],
    };

    const result = await validateReleaseContract(contract, { assetsDir: tmpDir });
    expect(result.valid).toBe(true);

    // Now test with corrupted checksum
    const corruptedContract = {
      ...contract,
      assets: [
        {
          ...contract.assets[0],
          sha256: '0000000000000000000000000000000000000000000000000000000000000000',
        },
      ],
    };
    const badResult = await validateReleaseContract(corruptedContract, { assetsDir: tmpDir });
    expect(badResult.valid).toBe(false);
    expect(badResult.errors.some((e: string) => e.includes('digest mismatch'))).toBe(true);

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
