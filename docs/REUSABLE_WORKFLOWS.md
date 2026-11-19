# HENU Reusable Workflows Reference

This document provides a comprehensive specification of all reusable GitHub Actions workflows in `henu-common-actions`.

---

## 1. `release-orchestrator.yml`

Top-level end-to-end release pipeline coordinator. Independent HENU product repositories call this workflow to execute validation, multi-platform compilation, cryptographic checksumming, SLSA provenance attestation, GitHub Release publication, and Platform API notification.

### Caller Permissions

```yaml
permissions:
  contents: write
  id-token: write
  attestations: write
```

### Inputs

| Name                    | Type      | Required | Default           | Description                                                           |
| :---------------------- | :-------- | :------- | :---------------- | :-------------------------------------------------------------------- |
| `product-id`            | `string`  | **Yes**  | —                 | Kebab-case product identifier (e.g. `henu-pa`, `henu-ai`, `henu-ide`) |
| `product-name`          | `string`  | No       | `''`              | Human-readable product display name                                   |
| `version`               | `string`  | **Yes**  | —                 | Semantic version (SemVer 2.0.0, e.g. `1.0.0` or `1.1.0-beta.1`)       |
| `channel`               | `string`  | No       | `'stable'`        | Release tier (`stable`, `beta`, `nightly`)                            |
| `git-tag`               | `string`  | No       | `''`              | Git tag being published (e.g. `v1.0.0`)                               |
| `release-notes`         | `string`  | **Yes**  | —                 | Markdown formatted release notes / changelog                          |
| `min-hub-version`       | `string`  | No       | `'1.0.0'`         | Minimum HENU HUB version required                                     |
| `build-linux`           | `boolean` | No       | `true`            | Whether to trigger Linux build job                                    |
| `linux-format`          | `string`  | No       | `'appimage'`      | Linux package format (`appimage`, `deb`, `tar.gz`)                    |
| `linux-arch`            | `string`  | No       | `'x86_64'`        | Linux architecture (`x86_64`, `arm64`)                                |
| `linux-build-command`   | `string`  | No       | `'npm run build'` | Shell command for Linux build                                         |
| `build-windows`         | `boolean` | No       | `true`            | Whether to trigger Windows build job                                  |
| `windows-format`        | `string`  | No       | `'msi'`           | Windows package format (`msi`, `exe`, `zip`)                          |
| `windows-arch`          | `string`  | No       | `'x86_64'`        | Windows architecture (`x86_64`, `arm64`)                              |
| `windows-build-command` | `string`  | No       | `'npm run build'` | PowerShell command for Windows build                                  |
| `build-macos`           | `boolean` | No       | `true`            | Whether to trigger macOS build job                                    |
| `macos-format`          | `string`  | No       | `'dmg'`           | macOS package format (`dmg`, `pkg`, `zip`)                            |
| `macos-arch`            | `string`  | No       | `'universal'`     | macOS architecture (`arm64`, `x86_64`, `universal`)                   |
| `macos-build-command`   | `string`  | No       | `'npm run build'` | Shell command for macOS build                                         |
| `platform-api-url`      | `string`  | No       | `''`              | Platform API webhook endpoint URL                                     |

### Secrets

| Name                      | Required | Description                                                                       |
| :------------------------ | :------- | :-------------------------------------------------------------------------------- |
| `platform-webhook-secret` | No       | HMAC-SHA256 secret key for signing webhook payloads delivered to the Platform API |

---

## 2. Platform Build Workflows

### `build-linux.yml`

Compiles, packages, and verifies Linux distribution binaries.

- **Permissions**: `contents: read`
- **Runner**: `ubuntu-latest`
- **Inputs**: `product-id`, `version`, `package-format` (`appimage`, `deb`, `tar.gz`), `arch`, `build-command`, `output-dir`
- **Outputs**: `artifact-name`

### `build-windows.yml`

Compiles, packages, and verifies Windows installers.

- **Permissions**: `contents: read`
- **Runner**: `windows-latest`
- **Inputs**: `product-id`, `version`, `package-format` (`msi`, `exe`, `zip`), `arch`, `build-command`, `output-dir`
- **Outputs**: `artifact-name`

### `build-macos.yml`

Compiles, packages, and verifies macOS bundles.

- **Permissions**: `contents: read`
- **Runner**: `macos-latest`
- **Inputs**: `product-id`, `version`, `package-format` (`dmg`, `pkg`, `zip`), `arch`, `build-command`, `output-dir`
- **Outputs**: `artifact-name`

---

## 3. Verification & Publication Workflows

### `validate-release.yml`

Validates semantic versioning consistency, tag alignment, release channel safety, and non-empty changelog.

- **Inputs**: `version`, `git-tag`, `channel`, `release-notes`
- **Outputs**: `is-valid`

### `validate-metadata.yml`

Validates full release contract JSON against `schemas/release-contract.schema.json` and on-disk files.

- **Inputs**: `manifest-path`, `assets-dir`, `git-tag`
- **Outputs**: `is-valid`

### `generate-checksums.yml`

Downloads all compiled multi-platform artifacts, computes streaming SHA-256 digests, and generates a unified `SHA256SUMS` file.

- **Inputs**: `assets-dir`
- **Outputs**: `sums-file`

### `verify-provenance.yml`

Generates verifiable SLSA Build Attestations for all binary packages.

- **Permissions**: `id-token: write`, `attestations: write`, `contents: read`
- **Inputs**: `assets-dir`
- **Outputs**: `attestation-url`

### `publish-release.yml`

Creates or updates a GitHub Release with attached binaries, `SHA256SUMS`, and release notes.

- **Permissions**: `contents: write`
- **Inputs**: `tag-name`, `release-name`, `release-notes`, `channel`, `assets-dir`, `draft`
- **Outputs**: `release-id`, `release-url`

### `notify-platform-api.yml`

Dispatches an HMAC-SHA256 signed release notification webhook to the HENU Platform API.

- **Permissions**: `contents: read`
- **Inputs**: `api-url`, `manifest-path`
- **Secrets**: `webhook-secret`
