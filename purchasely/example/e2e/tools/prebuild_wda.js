#!/usr/bin/env node
// Build WebDriverAgent ONCE, before any Appium session exists.
//
// Why this file exists: WDA's first build on a cold macOS runner costs minutes, and
// appium used to run it *inside* the first session-creation request. Anything that made
// that request fail — a client timeout, a retry — left the build running server-side while
// a second driver started its own on the same simulator and the same DerivedData dir. Nine
// concurrent xcodebuilds later, the first WDA came up 18m47s after the first session
// started (run 34126281588). Building here makes it one build, in one place, with its
// duration visible in the CI log instead of hidden inside a session timeout.
//
// The build settings MUST match what appium passes at session time, or xcodebuild sees
// changed settings and silently rebuilds everything anyway. So this does not hand-write an
// xcodebuild line: it drives appium's own WebDriverAgent class, the same one the driver
// uses, with buildOnly=true. The one thing it adds is `derivedDataPath` — the driver's
// bundled `appium driver run xcuitest build-wda` script does not accept one and builds into
// a throwaway temp dir, which is useless for a build meant to be reused and cached.
//
// The derived data path and the target udid are read from wdio.ios.conf.js, so the build
// and the sessions cannot drift apart.
//
// Failure here is not fatal: the caller warns and lets the session build WDA the old way.

const path = require('path');
const { config } = require('../wdio.ios.conf');

// appium-webdriveragent & friends are dependencies OF the xcuitest driver, so npm may hoist
// them next to it or nest them under it. Resolve from the driver's own directory first.
const driverDir = path.dirname(require.resolve('appium-xcuitest-driver/package.json'));
const req = (name) => require(require.resolve(name, { paths: [driverDir, __dirname] }));

const { WebDriverAgent } = req('appium-webdriveragent');
const xcode = req('appium-xcode');
const { Simctl } = req('node-simctl');
const { getSimulator } = req('appium-ios-simulator');

async function main() {
  const caps = config.capabilities[0];
  const derivedDataPath = caps['appium:derivedDataPath'];
  const wantedUdid = caps['appium:udid'];
  const wantedName = caps['appium:deviceName'];

  // Find the simulator the specs will run on. Its runtime version matters: appium passes it
  // as IPHONEOS_DEPLOYMENT_TARGET, and a different value is a different build.
  const bySdk = await new Simctl().getDevices(null, 'iOS');
  const all = Object.values(bySdk).flat();
  const info = wantedUdid
    ? all.find((d) => d.udid === wantedUdid)
    : all.find((d) => d.name.includes(wantedName || 'iPhone'));
  if (!info) {
    throw new Error(
      `No available iOS simulator matching ${wantedUdid || wantedName}. Found: ` +
        all.map((d) => `${d.name} (${d.udid})`).join(', ')
    );
  }

  const device = await getSimulator(info.udid, {
    platform: info.platform,
    checkExistence: false,
  });
  const wda = new WebDriverAgent(await xcode.getVersion(true), {
    iosSdkVersion: info.sdk,
    platformVersion: info.sdk,
    showXcodeLog: true,
    derivedDataPath,
    device,
  });

  console.log(
    `Prebuilding WebDriverAgent for ${info.name} (iOS ${info.sdk}, ${info.udid}) ` +
      `into ${derivedDataPath}`
  );
  const startedAt = Date.now();
  await wda.xcodebuild.start(true); // buildOnly
  console.log(`WebDriverAgent build finished in ${Math.round((Date.now() - startedAt) / 1000)}s`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
