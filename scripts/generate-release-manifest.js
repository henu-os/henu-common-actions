#!/usr/bin/env node

/**
 * HENU Release Automation - Release Manifest Generator
 * Aggregates build outputs into a certified release contract manifest.
 */

const fs = require('fs');
const path = require('path');
const { calculateFileSha256 } = require('./generate-checksums');

async function buildReleaseManifest({
  productId,
  productName,
  version,
  channel,
  releaseNotes,
  minHubVersion,
  assetsDir,
  assetsConfig = [],
}) {
  const assets = [];

  for (const cfg of assetsConfig) {
    const fullPath = path.join(assetsDir, cfg.fileName);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required asset binary missing: ${cfg.fileName} in ${assetsDir}`);
    }

    const stat = fs.statSync(fullPath);
    const sha256 = await calculateFileSha256(fullPath);

    assets.push({
      fileName: cfg.fileName,
      os: cfg.os,
      arch: cfg.arch,
      packageFormat: cfg.packageFormat,
      sha256,
      sizeBytes: stat.size,
      installer: cfg.installer,
    });
  }

  const manifest = {
    productId,
    productName: productName || productId,
    version,
    channel,
    releaseDate: new Date().toISOString(),
    releaseNotes: releaseNotes || `Release ${version} for ${productName || productId}`,
    ...(minHubVersion ? { minHubVersion } : {}),
    assets,
  };

  return manifest;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const configFile = args[0];
  const outputPath = args[1] || 'henu-release-manifest.json';

  if (!configFile || !fs.existsSync(configFile)) {
    console.error('Usage: generate-release-manifest <release-config.json> [output-path]');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  buildReleaseManifest(config)
    .then((manifest) => {
      fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
      console.log(
        `[HENU Release Manifest] Generated ${outputPath} with ${manifest.assets.length} assets.`,
      );
    })
    .catch((err) => {
      console.error(`[HENU Release Manifest ERROR] ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  buildReleaseManifest,
};
