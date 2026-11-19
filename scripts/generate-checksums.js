#!/usr/bin/env node

/**
 * HENU Release Automation - Streaming Checksum Generator
 * Computes cryptographically-secure SHA-256 digests for release packages
 * and generates standard SHA256SUMS files.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function calculateFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => reject(err));
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
  });
}

async function processDirectory(dirPath, outputFile) {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Asset directory not found: ${dirPath}`);
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results = [];
  const sumsLines = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    // Skip checksum files themselves
    if (
      entry.name.endsWith('.sha256') ||
      entry.name.endsWith('SHA256SUMS') ||
      entry.name.endsWith('.sig')
    ) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const stat = fs.statSync(fullPath);
    const sha256 = await calculateFileSha256(fullPath);

    results.push({
      fileName: entry.name,
      sizeBytes: stat.size,
      sha256,
    });

    sumsLines.push(`${sha256}  ${entry.name}`);
  }

  // Write SHA256SUMS file
  const outSumsPath = outputFile || path.join(dirPath, 'SHA256SUMS');
  fs.writeFileSync(outSumsPath, sumsLines.join('\n') + (sumsLines.length ? '\n' : ''));

  return { results, sumsFilePath: outSumsPath };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const dirPath = args[0] || process.cwd();
  const outputFile = args[1];

  processDirectory(dirPath, outputFile)
    .then(({ results, sumsFilePath }) => {
      console.log(`[HENU Checksums] Computed SHA-256 for ${results.length} files.`);
      console.log(`[HENU Checksums] Written to ${sumsFilePath}`);
      console.log(JSON.stringify(results, null, 2));
    })
    .catch((err) => {
      console.error(`[HENU Checksums ERROR] ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  calculateFileSha256,
  processDirectory,
};
