# HENU Release Contract Specification

The **HENU Release Contract** defines the mandatory metadata, platform package attributes, and cryptographic assurances required for any software release published within the HENU ecosystem.

---

## 1. Release Contract Fields

| Field           | Type     | Required | Description                                                              |
| :-------------- | :------- | :------: | :----------------------------------------------------------------------- |
| `productId`     | `string` | **Yes**  | Lowercase kebab-case identifier (e.g. `henu-pa`, `henu-ai`, `henu-ide`). |
| `productName`   | `string` |    No    | Human-readable title of the application.                                 |
| `version`       | `string` | **Yes**  | SemVer 2.0.0 compliant version string (e.g. `1.0.0`, `1.1.0-beta.1`).    |
| `channel`       | `string` | **Yes**  | Target release channel: `stable`, `beta`, or `nightly`.                  |
| `releaseDate`   | `string` |    No    | ISO 8601 publication timestamp (e.g. `2026-11-19T00:00:00Z`).            |
| `releaseNotes`  | `string` | **Yes**  | Markdown formatted release notes / changelog.                            |
| `minHubVersion` | `string` |    No    | Minimum compatible HENU HUB desktop version (e.g. `1.0.0`).              |
| `assets`        | `array`  | **Yes**  | Array of installable binary packages (minimum 1).                        |

---

## 2. Asset Specification

Each item in the `assets` array must define:

| Field           | Type      | Allowed Values                                                        | Description                        |
| :-------------- | :-------- | :-------------------------------------------------------------------- | :--------------------------------- |
| `fileName`      | `string`  | e.g. `henu-pa-1.0.0-windows-x64.msi`                                  | Binary package file name.          |
| `os`            | `string`  | `windows`, `macos`, `linux`                                           | Target host operating system.      |
| `arch`          | `string`  | `x86_64`, `arm64`, `universal`                                        | Target CPU architecture.           |
| `packageFormat` | `string`  | `exe`, `msi`, `dmg`, `pkg`, `deb`, `rpm`, `appimage`, `tar.gz`, `zip` | Package archive format.            |
| `sha256`        | `string`  | Lowercase 64-character hex string                                     | Cryptographic digest.              |
| `sizeBytes`     | `integer` | Minimum 1                                                             | File size in bytes.                |
| `downloadUrl`   | `string`  | Public HTTPS URL                                                      | Package download link.             |
| `installer`     | `object`  | Optional                                                              | `executablePath` and `silentArgs`. |

---

## 3. Channel & Pre-Release Safety Rules

1. **Pre-release tags must not target `stable`**: Any version string containing a pre-release suffix (e.g., `-beta.1`, `-rc.2`) cannot be published under the `stable` channel.
2. **Stable versions must not target `nightly`**: Standard release tags (e.g., `1.0.0`) cannot target `nightly` without a pre-release identifier.
3. **No incomplete releases**: If a product advertises Windows, macOS, and Linux compatibility, the orchestrator verifies all corresponding packages before marking the release installable.
