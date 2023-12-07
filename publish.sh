#!/bin/bash

VERSION=$1

#replace version number in json files
sed -i '' "s/^.*\"version\":.*$/  \"version\": \"${VERSION}\",/" purchasely/package.json
#sed -i '' "s/^.*\#plugin id=\"@purchasely#cordova-plugin-purchasely\" \"version\"=.*$/plop/" purchasely/plugin.xml

sed -i '' "s/^.*\"version\":.*$/  \"version\": \"${VERSION}\",/" purchasely-google/package.json
#sed -i '' "s/^.*id=\"@purchasely/cordova-plugin-purchasely-google\" \"version\"=.*$/id=\"@purchasely/cordova-plugin-purchasely-google\" \"version\"=\"${VERSION}\",/" purchasely-google/plugin.xml

#replace version number in Purchasely.js
sed -i '' "s/^.*        cordovaSdkVersion.*$/        cordovaSdkVersion = \"${VERSION}\";/" purchasely/www/Purchasely.js

#publish
if [[ $2 = true ]]
then
    cd purchasely && npm publish --access public
    cd ../purchasely-google && npm publish --access public

else
    echo "BEFORE calling same command with true as second parameter"
    echo "Update both plugin.xml files manually to ${VERSION}"
    echo "You should have"
    echo "<plugin id=\"@purchasely/cordova-plugin-purchasely\" \"version\"=\"${VERSION}\""
    echo "<plugin id=\"@purchasely/cordova-plugin-purchasely-google\" \"version\"=\"${VERSION}\""
    #cd purchasely && yarn && yarn prepare
    #cd ../purchasely-google && yarn && yarn prepare
fi