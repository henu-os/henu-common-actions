import fs from 'fs';
import path from 'path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

describe('Universal Release Manifest Specification', () => {
  const schemaPath = path.join(__dirname, '../schemas/release-manifest.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  it('validates a complete multi-platform desktop release manifest', () => {
    const validDesktopManifest = {
      $schema: 'https://schema.henuos.in/v1/release-manifest.schema.json',
      schemaVersion: '1.0.0',
      applicationId: 'henu-pa',
      applicationName: 'HENU Personal Assistant',
      applicationVersion: '1.0.0',
      releaseTag: 'v1.0.0',
      releaseChannel: 'stable',
      applicationType: 'desktop',
      publicationTimestamp: '2026-11-19T12:00:00Z',
      releaseNotes: '### Initial Stable Production Release\n- Integrated workspace agent.',
      minHubVersion: '1.0.0',
      assets: [
        {
          os: 'windows',
          arch: 'x86_64',
          packageFormat: 'msi',
          downloadUrl: 'https://github.com/henu-os/henu-pa/releases/download/v1.0.0/henu-pa-1.0.0-windows-x86_64.msi',
          fileName: 'henu-pa-1.0.0-windows-x86_64.msi',
          sizeBytes: 85420100,
          sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        },
        {
          os: 'macos',
          arch: 'arm64',
          packageFormat: 'dmg',
          downloadUrl: 'https://github.com/henu-os/henu-pa/releases/download/v1.0.0/henu-pa-1.0.0-macos-arm64.dmg',
          fileName: 'henu-pa-1.0.0-macos-arm64.dmg',
          sizeBytes: 94100200,
          sha256: 'b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
        },
        {
          os: 'linux',
          arch: 'x86_64',
          packageFormat: 'appimage',
          downloadUrl: 'https://github.com/henu-os/henu-pa/releases/download/v1.0.0/henu-pa-1.0.0-linux-x86_64.AppImage',
          fileName: 'henu-pa-1.0.0-linux-x86_64.AppImage',
          sizeBytes: 78500400,
          sha256: 'c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2',
        },
      ],
    };

    const isValid = validate(validDesktopManifest);
    if (!isValid) console.error(validate.errors);
    expect(isValid).toBe(true);
  });

  it('validates a production web application release manifest without desktop packages', () => {
    const validWebManifest = {
      $schema: 'https://schema.henuos.in/v1/release-manifest.schema.json',
      schemaVersion: '1.0.0',
      applicationId: 'henu-addplo',
      applicationName: 'HENU Platform Administration Console',
      applicationVersion: '1.0.0',
      releaseTag: 'v1.0.0',
      releaseChannel: 'stable',
      applicationType: 'web',
      publicationTimestamp: '2026-11-19T12:00:00Z',
      releaseNotes: '### HENU Admin Web Console 1.0.0\n- Full administrative control suite.',
      webDeployment: {
        webAppUrl: 'https://admin.henuos.in/',
        entrypoint: 'index.html',
        bundleArchive: {
          downloadUrl: 'https://github.com/henu-os/henu-addplo/releases/download/v1.0.0/henu-addplo-1.0.0-web.tar.gz',
          fileName: 'henu-addplo-1.0.0-web.tar.gz',
          sizeBytes: 15420100,
          sha256: 'd4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3',
        },
      },
    };

    const isValid = validate(validWebManifest);
    if (!isValid) console.error(validate.errors);
    expect(isValid).toBe(true);
  });

  it('rejects an empty SHA-256 digest', () => {
    const manifestWithEmptySha = {
      $schema: 'https://schema.henuos.in/v1/release-manifest.schema.json',
      schemaVersion: '1.0.0',
      applicationId: 'henu-pa',
      applicationVersion: '1.0.0',
      releaseTag: 'v1.0.0',
      releaseChannel: 'stable',
      applicationType: 'desktop',
      publicationTimestamp: '2026-11-19T12:00:00Z',
      releaseNotes: 'Testing empty checksum rejection',
      assets: [
        {
          os: 'windows',
          arch: 'x86_64',
          packageFormat: 'exe',
          downloadUrl: 'https://github.com/henu-os/henu-pa/releases/download/v1.0.0/henu-pa-1.0.0-windows-x86_64.exe',
          fileName: 'henu-pa-1.0.0-windows-x86_64.exe',
          sizeBytes: 85420100,
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Empty string SHA256
        },
      ],
    };

    const isValid = validate(manifestWithEmptySha);
    expect(isValid).toBe(false);
  });

  it('rejects placeholder example domains', () => {
    const manifestWithPlaceholder = {
      $schema: 'https://schema.henuos.in/v1/release-manifest.schema.json',
      schemaVersion: '1.0.0',
      applicationId: 'henu-pa',
      applicationVersion: '1.0.0',
      releaseTag: 'v1.0.0',
      releaseChannel: 'stable',
      applicationType: 'desktop',
      publicationTimestamp: '2026-11-19T12:00:00Z',
      releaseNotes: 'Testing placeholder domain rejection',
      assets: [
        {
          os: 'windows',
          arch: 'x86_64',
          packageFormat: 'exe',
          downloadUrl: 'https://cdn.henuos.example/releases/henu-pa/v1.0.0/henu-pa.exe',
          fileName: 'henu-pa.exe',
          sizeBytes: 85420100,
          sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        },
      ],
    };

    const isValid = validate(manifestWithPlaceholder);
    expect(isValid).toBe(false);
  });
});
