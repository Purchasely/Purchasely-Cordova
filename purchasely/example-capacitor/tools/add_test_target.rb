#!/usr/bin/env ruby
# Adds the AppTests unit-test target to the Capacitor sample's Xcode project.
#
# `npx cap add ios` extracts a fixed template that has no test target, so the target has
# to be created once and committed. Re-run this only if the ios/ project is regenerated
# from scratch; `npx cap sync` does not remove it.
#
#   GEM_HOME=$(dirname $(dirname $(readlink -f $(which pod)))) ruby tools/add_test_target.rb
#
# The xcodeproj gem ships with CocoaPods, so no extra install is needed.

require 'xcodeproj'

PROJECT = File.expand_path('../ios/App/App.xcodeproj', __dir__)
TARGET_NAME = 'AppTests'

project = Xcodeproj::Project.open(PROJECT)
app = project.targets.find { |t| t.name == 'App' } or abort 'No App target found'

if project.targets.any? { |t| t.name == TARGET_NAME }
  puts "#{TARGET_NAME} already exists, nothing to do"
  exit 0
end

test_target = project.new_target(:unit_test_bundle, TARGET_NAME, :ios, '15.0')
test_target.add_dependency(app)

group = project.main_group.new_group(TARGET_NAME, TARGET_NAME)
Dir[File.join(File.dirname(PROJECT), TARGET_NAME, '*.m')].sort.each do |source|
  test_target.add_file_references([group.new_file(File.basename(source))])
end

test_target.build_configurations.each do |config|
  config.build_settings.merge!(
    # Host the tests in the app so they link against the same pods the app links,
    # CordovaPluginsStatic (the plugin sources) and the Purchasely SDK included.
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'TEST_HOST' => '$(BUILT_PRODUCTS_DIR)/App.app/App',
    'BUNDLE_LOADER' => '$(TEST_HOST)',
    'PRODUCT_BUNDLE_IDENTIFIER' => 'io.purchasely.sample.capacitor.tests',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'IPHONEOS_DEPLOYMENT_TARGET' => '15.0'
  )
end

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_test_target(test_target)
scheme.set_launch_target(app)
scheme.save_as(PROJECT, TARGET_NAME)

# Xcode autocreates the App scheme into xcuserdata, which ios/.gitignore excludes, so a
# fresh clone has no App scheme and `xcodebuild -scheme App` fails. Share it explicitly:
# the E2E workflow builds the simulator .app with it.
app_scheme = Xcodeproj::XCScheme.new
app_scheme.add_build_target(app)
app_scheme.set_launch_target(app)
app_scheme.save_as(PROJECT, app.name)

project.save
puts "Added #{TARGET_NAME} target and scheme"
