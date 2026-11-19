import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { calculateFileSha256, processDirectory } from '../scripts/generate-checksums';

describe('Streaming Checksum Generation', () => {
  const tmpDir = path.join(__dirname, 'tmp-checksums');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('computes exact SHA-256 checksum for a sample file', async () => {
    const filePath = path.join(tmpDir, 'sample-binary.bin');
    const content = 'Test binary content for HENU verification';
    fs.writeFileSync(filePath, content);

    const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
    const actualHash = await calculateFileSha256(filePath);

    expect(actualHash).toBe(expectedHash);
    expect(actualHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('scans directory and outputs standard SHA256SUMS file', async () => {
    const file1 = path.join(tmpDir, 'app.exe');
    const file2 = path.join(tmpDir, 'app.dmg');
    fs.writeFileSync(file1, 'Executable data');
    fs.writeFileSync(file2, 'Disk image data');

    const outputFile = path.join(tmpDir, 'SHA256SUMS');
    const { results, sumsFilePath } = await processDirectory(tmpDir, outputFile);

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(fs.existsSync(sumsFilePath)).toBe(true);

    const sumsContent = fs.readFileSync(sumsFilePath, 'utf8');
    expect(sumsContent).toContain('app.exe');
    expect(sumsContent).toContain('app.dmg');

    // SHA256SUMS format: 64 hex chars + 2 spaces + filename
    const lines = sumsContent.trim().split('\n');
    lines.forEach((line) => {
      expect(line).toMatch(/^[a-f0-9]{64}\s\s.+$/);
    });
  });
});
