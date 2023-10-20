#!/bin/bash

cordova plugin remove @purchasely/cordova-plugin-purchasely
cordova platform remove ios
cordova platform add ios@7.0.1
cordova plugin add ../ --link

if [[ $1 = true ]]
then
    echo "Remove podfile"
    rm platforms/ios/Podfile.lock
    echo "Pod repo update"
    pod repo update
    echo "Installing Purchasely SDK"
    pod install --project-directory=platforms/ios
fi