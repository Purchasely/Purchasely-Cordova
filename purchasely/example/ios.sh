#!/bin/bash

npm ci
cordova plugin remove @purchasely/cordova-plugin-purchasely --nosave
cordova platform remove ios --nosave
cordova platform add ios@8.1.1 --nosave
cordova plugin add ../ --link --nosave

if [[ $1 = true ]]
then
    echo "Remove podfile"
    rm platforms/ios/Podfile.lock
    echo "Pod repo update"
    pod repo update
    echo "Installing Purchasely SDK"
    pod install --project-directory=platforms/ios
fi
