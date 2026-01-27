# Release Process

This document describes the steps required to publish a new version of the Purchasely Cordova SDK.

## Prerequisites

- Node.js and npm installed
- Cordova CLI installed (`npm install -g cordova`)
- CocoaPods installed (for iOS testing)
- Android SDK configured (for Android testing)
- npm account with publish access to `@purchasely` scope

## Version Update Checklist

### 1. Update Version Numbers

Update the version number in the following files:

| File | What to Update |
|------|----------------|
| `purchasely/plugin.xml` | `version` attribute in `<plugin>` tag |
| `purchasely/package.json` | `version` field |
| `purchasely-google/plugin.xml` | `version` attribute in `<plugin>` tag |
| `purchasely-google/package.json` | `version` field |

### 2. Update Native SDK Versions (if applicable)

If updating the underlying native SDKs:

**iOS (CocoaPods):**
- Edit `purchasely/plugin.xml`
- Update the `spec` attribute in: `<pod name="Purchasely" spec="X.Y.Z"/>`

**Android (Gradle):**
- Edit `purchasely/plugin.xml`
- Update: `<framework src="io.purchasely:core:X.Y.Z" />`
- Edit `purchasely-google/plugin.xml`
- Update: `<framework src="io.purchasely:google-play:X.Y.Z" />`

### 3. Update VERSIONS.md

Add a new row to the version table in `VERSIONS.md`:

```markdown
| X.Y.Z   | iOS_VERSION | ANDROID_VERSION |
```

### 4. Update Purchasely.js

The `publish.sh` script handles this automatically, but if doing manually:
- Edit `purchasely/www/Purchasely.js`
- Update the `cordovaSdkVersion` variable

## Testing

### Build iOS Example

```bash
cd purchasely/example
sh ios.sh true
cordova build ios
```

### Build Android Example

```bash
cd purchasely/example
sh android.sh
cordova build android
```

## Publishing

### Dry Run (Recommended First)

Run the publish script without the `true` flag to see what will be updated:

```bash
sh publish.sh X.Y.Z
```

This will:
- Update version numbers in `package.json` files
- Update `cordovaSdkVersion` in `Purchasely.js`
- Show you what manual updates are needed for `plugin.xml` files

### Verify plugin.xml Updates

Ensure both `plugin.xml` files have the correct version:

```xml
<!-- purchasely/plugin.xml -->
<plugin id="@purchasely/cordova-plugin-purchasely" version="X.Y.Z" ...>

<!-- purchasely-google/plugin.xml -->
<plugin id="@purchasely/cordova-plugin-purchasely-google" version="X.Y.Z" ...>
```

### Publish to npm

Once everything is verified:

```bash
sh publish.sh X.Y.Z true
```

This will publish both packages to npm:
- `@purchasely/cordova-plugin-purchasely`
- `@purchasely/cordova-plugin-purchasely-google`

## Post-Release

### 1. Commit and Tag

```bash
git add .
git commit -m "Release X.Y.Z"
git tag X.Y.Z
git push origin main --tags
```

### 2. Create GitHub Release

1. Go to the GitHub repository
2. Click "Releases" → "Create a new release"
3. Select the tag you just pushed
4. Add release notes describing:
   - New features
   - Bug fixes
   - Breaking changes (if any)
   - Native SDK version updates

### 3. Verify npm Publication

Check that the packages are available:

```bash
npm view @purchasely/cordova-plugin-purchasely version
npm view @purchasely/cordova-plugin-purchasely-google version
```

## Troubleshooting

### "Cannot publish over previously published versions"

This error means the version already exists on npm. You need to bump to a new version number.

### CocoaPods version not found

If you get an error like `CocoaPods could not find compatible versions for pod "Purchasely"`:

1. Run `pod repo update` to refresh the local spec repository
2. Verify the iOS SDK version exists on CocoaPods: https://cocoapods.org/pods/Purchasely

### Android dependency resolution failure

If Gradle cannot find the Android SDK:
1. Verify the version exists on Maven Central
2. Check your Gradle/Maven configuration

## CI/CD

Pull requests are automatically validated by GitHub Actions (`.github/workflows/ci.yml`):

- **build-ios**: Builds the iOS example project
- **build-android**: Builds the Android example project  
- **validate-versions**: Ensures version consistency across all configuration files

All checks must pass before merging.