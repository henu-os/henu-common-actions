# HENU Common Actions & Release Automation

**henu-common-actions** is the official build, verification, and release engine engineered by **[HENU OS PRIVATE LIMITED](https://www.henuos.in/)**. It provides production-grade, security-hardened reusable GitHub Actions workflows, custom composite actions, schema validators, and release automation for all desktop and web products across the **HENU Operating System** ecosystem.

- **Official Website:** [https://www.henuos.in/](https://www.henuos.in/)
- **Organization:** [https://github.com/henu-os](https://github.com/henu-os)

---

## 1. Architecture & Release Contract

Every supported product release must strictly conform to the **HENU Release Contract** defined in [`schemas/release-contract.schema.json`](file:///H:/HENU-PLATFORM/henu-common-actions/schemas/release-contract.schema.json) and [`schemas/release-manifest.schema.json`](file:///H:/HENU-PLATFORM/henu-common-actions/schemas/release-manifest.schema.json):

- **Product ID**: Kebab-case identifier (e.g. `henu-pa`, `henu-ai`, `henu-ide`, `henu-admin`).
- **Semantic Version**: Strict SemVer 2.0.0 (`MAJOR.MINOR.PATCH[-PRERELEASE]`).
- **Release Channel**: `stable`, `beta`, `alpha`, or `nightly`.
- **Application Types**: `desktop`, `web`, `cli`, `hybrid`.
- **Target OS**: `windows`, `macos`, `linux`.
- **CPU Architecture**: `x86_64`, `arm64`, `universal`.
- **Desktop Formats**: `msi`, `exe`, `dmg`, `pkg`, `deb`, `appimage`, `tar.gz`, `zip`.
- **Web Formats**: Production bundle archive (`.tar.gz`) with verified HTTPS hosting entrypoints.
- **Cryptographic Integrity**: Streaming SHA-256 digests and unified `SHA256SUMS`.
- **Release Notes**: Mandatory Markdown changelog.
- **Minimum HUB Version**: Required client version for desktop orchestration.

---

## 2. Reusable Workflows Catalog

All reusable workflows are located in [`.github/workflows/`](file:///H:/HENU-PLATFORM/henu-common-actions/.github/workflows) and invoked via `workflow_call`:

| Workflow                       | Description                                   | Runner           | Key Output / Artifact                 |
| :----------------------------- | :-------------------------------------------- | :--------------- | :------------------------------------ |
| **`release-orchestrator.yml`** | Central multi-stage release coordinator       | Multi-OS         | GitHub Release, Checksums, Provenance |
| **`build-linux.yml`**          | Linux packaging (`appimage`, `deb`, `tar.gz`) | Native Linux     | Linux binary artifact                 |
| **`build-windows.yml`**        | Windows packaging (`msi`, `exe`, `zip`)       | `windows-latest` | Windows installer artifact            |
| **`build-macos.yml`**          | macOS packaging (`dmg`, `pkg`, `zip`)         | Native macOS     | macOS bundle artifact                 |
| **`build-web.yml`**            | Web app build & hosting deployment            | `ubuntu-latest`  | Web distribution archive              |
| **`validate-release.yml`**     | Validates SemVer, Git tags, channel alignment | `ubuntu-latest`  | `is-valid`                            |
| **`validate-metadata.yml`**    | Validates contract against JSON Schema        | `ubuntu-latest`  | `is-valid`                            |
| **`generate-checksums.yml`**   | Multi-platform streaming SHA-256 calculation  | `ubuntu-latest`  | `SHA256SUMS` file                     |
| **`verify-provenance.yml`**    | SLSA Build Attestation generation             | `ubuntu-latest`  | Attestation bundle                    |
| **`publish-release.yml`**      | Publishes GitHub Release with verified assets | `ubuntu-latest`  | `release-url`                         |
| **`notify-platform-api.yml`**  | HMAC-SHA256 signed Platform API webhook       | `ubuntu-latest`  | Webhook acknowledgment                |

---

## 3. Product Decoupling & Independent Releases

Each HENU product repository operates independently:

- **Publishing a `henu-pa` release does NOT trigger or require rebuilding `henu-ai`, `henu-ide`, or `henu-hub`**.
- Workflows are called dynamically with product-specific packaging arguments.

---

## 4. Example Integrations

### HENU PA ([`examples/henu-pa-release.yml`](file:///H:/HENU-PLATFORM/henu-common-actions/examples/henu-pa-release.yml))

```yaml
name: 'Release HENU PA'
on:
  push:
    tags: ['v*.*.*']
permissions:
  contents: write
  id-token: write
  attestations: write

jobs:
  release:
    uses: henu-os/henu-common-actions/.github/workflows/release-orchestrator.yml@v1
    with:
      product-id: 'henu-pa'
      product-name: 'HENU PA'
      version: '1.0.0'
      channel: 'stable'
      release-notes: 'HENU PA Production Release'
      build-windows: true
      windows-format: 'msi'
      build-macos: true
      macos-format: 'dmg'
      build-linux: true
      linux-format: 'appimage'
      platform-api-url: 'https://api.henuos.com/api/v1/webhooks/github'
    secrets:
      platform-webhook-secret: ${{ secrets.HENU_WEBHOOK_SECRET }}
```

### Additional Product Examples:

- **HENU AI**: [`examples/henu-ai-release.yml`](file:///H:/HENU-PLATFORM/henu-common-actions/examples/henu-ai-release.yml) (`exe`, `pkg`, `deb`)
- **HENU IDE**: [`examples/henu-ide-release.yml`](file:///H:/HENU-PLATFORM/henu-common-actions/examples/henu-ide-release.yml) (`zip`, `dmg`, `tar.gz`)

---

## 5. Security & Isolation Model

- **Least-Privilege Permissions**: Every workflow declares explicit `permissions:` (e.g. `contents: read` for build/validation, `contents: write` strictly for publishing, `id-token: write` for attestations).
- **Pinned Commit SHAs**: All external actions are pinned to reviewed 40-character hexadecimal commit SHAs (e.g. `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`).
- **HMAC Request Signing**: Webhooks delivered to the HENU Platform API are signed with `X-Hub-Signature-256 = sha256=<hmac>` using a shared secret.
- **No Credentials in Artifacts**: Build artifacts are verified and packaged without embedding tokens or secrets.

---

## 6. Testing & Development

Run the automated test suite and code quality linters:

```bash
cd henu-common-actions
npm install

# Run automated tests (Release contract, checksums, HMAC signing, YAML syntax)
npm test

# Lint scripts and test files
npm run lint

# Format codebase
npm run format
```

---

_Copyright &copy; 2026 HENU OS PRIVATE LIMITED. All rights reserved._
