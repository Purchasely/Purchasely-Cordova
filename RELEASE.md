# Release Process

This document describes the steps required to publish a new version of the Purchasely Cordova SDK.

## Quick Reference

Publishing is fully automated via GitHub Actions. Creating a GitHub release triggers CI checks then npm publish with trusted publishing (OIDC — no npm token needed).

## Step-by-Step Release

### 1. Create a release branch

```bash
git checkout main && git pull origin main
git checkout -b release/X.Y.Z
```

### 2. Update version numbers

Update **all** of the following files:

| File | What to Update |
|------|----------------|
| `purchasely/plugin.xml` | `version` attribute in `<plugin>` tag |
| `purchasely/plugin.xml` | `<pod name="Purchasely" spec="IOS_VERSION"/>` |
| `purchasely/plugin.xml` | `<framework src="io.purchasely:core:ANDROID_VERSION" />` |
| `purchasely/package.json` | `version` field |
| `purchasely/www/Purchasely.js` | `cordovaSdkVersion` fallback string |
| `purchasely-google/plugin.xml` | `version` attribute in `<plugin>` tag |
| `purchasely-google/plugin.xml` | `<framework src="io.purchasely:google-play:ANDROID_VERSION" />` |
| `purchasely-google/package.json` | `version` field |
| `VERSIONS.md` | Add new row with Cordova / iOS / Android versions |

> **Note:** The Cordova SDK version, iOS SDK version, and Android SDK version may differ. Check the native release tags for the correct versions.

### 3. Commit, push, and open a PR

```bash
git add -A
git commit -m "chore(release): bump Cordova SDK to X.Y.Z"
git push -u origin release/X.Y.Z
gh pr create --base main --title "chore(release): bump Cordova SDK to X.Y.Z" --body "..."
```

CI runs automatically on the PR (unit tests, iOS build, Android build, version consistency).

### 4. Merge the PR

Once CI passes, merge into `main`.

### 5. Create a GitHub release

```bash
git checkout main && git pull origin main
gh release create X.Y.Z --target main --title "X.Y.Z" --notes "..."
```

Include release notes from the native SDK releases:
- Android: `https://github.com/Purchasely/Purchasely-Android/releases/tag/ANDROID_VERSION`
- iOS: `https://github.com/Purchasely/Purchasely-iOS/releases/tag/IOS_VERSION`

### 6. Automated publish

Creating the release automatically triggers `.github/workflows/publish.yml` which:
1. Runs all CI checks (unit tests, iOS build, Android build, version validation)
2. Verifies package versions match the release tag
3. Publishes both packages to npm with provenance attestation

### 7. Verify

```bash
npm view @purchasely/cordova-plugin-purchasely version
npm view @purchasely/cordova-plugin-purchasely-google version
```

## CI/CD Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR on main, or called by publish | Unit tests, iOS build, Android build, version consistency |
| `publish.yml` | GitHub release published | Runs CI then publishes to npm via OIDC trusted publishing |

### npm Trusted Publishing

Publishing uses OIDC-based trusted publishing — **no npm token or secret is stored in the repo**. Authentication is configured per-package on npmjs.com:

- `https://www.npmjs.com/package/@purchasely/cordova-plugin-purchasely/access` → Trusted Publisher → GitHub Actions → `Purchasely/Purchasely-Cordova` / `publish.yml`
- `https://www.npmjs.com/package/@purchasely/cordova-plugin-purchasely-google/access` → same config

This never expires and requires no rotation.

## Troubleshooting

### "Cannot publish over previously published versions"

The version already exists on npm. Bump to a new version number.

### CocoaPods version not found

1. Run `pod repo update` to refresh the local spec repository
2. Verify the iOS SDK version exists: https://cocoapods.org/pods/Purchasely

### Android dependency resolution failure

1. Verify the version exists on Maven Central
2. Check Gradle/Maven configuration

### Trusted publishing fails

1. Verify the trusted publisher is configured on npmjs.com for both packages
2. Ensure the workflow filename matches exactly (`publish.yml`)
3. Ensure npm CLI >= 11.5.1 (the workflow handles this automatically)
