#!/usr/bin/env node

/**
 * HENU Release Contract Validator
 * Enforces strict compliance with the release specification before any publication.
 */

const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const { calculateFileSha256 } = require('./generate-checksums');

const schemaPath = path.join(__dirname, '../schemas/release-contract.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

async function validateReleaseContract(contractData, options = {}) {
  const errors = [];

  // 1. Schema Validation
  const valid = validateSchema(contractData);
  if (!valid) {
    validateSchema.errors.forEach((err) => {
      errors.push(`Schema Error: ${err.instancePath} ${err.message}`);
    });
    return { valid: false, errors };
  }

  // 2. Tag & Version consistency check
  if (options.gitTag) {
    const rawTag = options.gitTag.startsWith('v') ? options.gitTag.slice(1) : options.gitTag;
    if (rawTag !== contractData.version) {
      errors.push(
        `Git tag '${options.gitTag}' does not match contract version '${contractData.version}'`,
      );
    }
  }

  // 3. Pre-release channel safety
  const isPreRelease = contractData.version.includes('-');
  if (isPreRelease && contractData.channel === 'stable') {
    errors.push(
      `Safety violation: Pre-release version '${contractData.version}' cannot be published to 'stable' channel.`,
    );
  }
  if (!isPreRelease && contractData.channel === 'nightly') {
    errors.push(
      `Channel mismatch: Stable semver '${contractData.version}' should not be targeted at 'nightly' channel without a pre-release identifier.`,
    );
  }

  // 4. Asset File Verification on Disk
  if (options.assetsDir) {
    if (!fs.existsSync(options.assetsDir)) {
      errors.push(`Assets directory not found: ${options.assetsDir}`);
    } else {
      for (const asset of contractData.assets) {
        const filePath = path.join(options.assetsDir, asset.fileName);
        if (!fs.existsSync(filePath)) {
          errors.push(`Missing declared release asset on disk: ${asset.fileName}`);
          continue;
        }

        const stat = fs.statSync(filePath);
        if (stat.size !== asset.sizeBytes) {
          errors.push(
            `Asset '${asset.fileName}' size mismatch: declared ${asset.sizeBytes} bytes, found ${stat.size} bytes on disk.`,
          );
        }

        const actualSha256 = await calculateFileSha256(filePath);
        if (actualSha256 !== asset.sha256.toLowerCase()) {
          errors.push(
            `Asset '${asset.fileName}' SHA-256 digest mismatch:\n  Declared: ${asset.sha256}\n  Actual:   ${actualSha256}`,
          );
        }
      }
    }
  }

  // 5. Ensure no duplicate platform/architecture bundles in same release
  const seenCombos = new Set();
  for (const asset of contractData.assets) {
    const key = `${asset.os}-${asset.arch}-${asset.packageFormat}`;
    if (seenCombos.has(key)) {
      errors.push(
        `Duplicate asset format for OS '${asset.os}', Arch '${asset.arch}', Format '${asset.packageFormat}' in same release contract.`,
      );
    }
    seenCombos.add(key);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: validate-release-contract <contract.json> [--assets-dir <dir>] [--git-tag <tag>]',
    );
    process.exit(1);
  }

  const contractPath = args[0];
  let assetsDir = null;
  let gitTag = null;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--assets-dir' && args[i + 1]) {
      assetsDir = args[++i];
    } else if (args[i] === '--git-tag' && args[i + 1]) {
      gitTag = args[++i];
    }
  }

  if (!fs.existsSync(contractPath)) {
    console.error(`Release contract file not found: ${contractPath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  validateReleaseContract(rawData, { assetsDir, gitTag })
    .then(({ valid, errors }) => {
      if (!valid) {
        console.error('[HENU Release Contract] Validation FAILED with errors:');
        errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
      console.log('[HENU Release Contract] Validation PASSED.');
      console.log(`  Product: ${rawData.productId} (v${rawData.version})`);
      console.log(`  Channel: ${rawData.channel}`);
      console.log(`  Assets:  ${rawData.assets.length} validated`);
    })
    .catch((err) => {
      console.error(`[HENU Release Contract FATAL] ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  validateReleaseContract,
};
