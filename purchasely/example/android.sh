#!/bin/bash

cordova plugin remove @purchasely/cordova-plugin-purchasely
cordova plugin remove @purchasely/cordova-plugin-purchasely-google
cordova plugin remove cordova-plugin-purchasely
cordova plugin remove cordova-plugin-purchasely-google
cordova platform remove android
cordova platform add android@latest
cordova plugin add ../ --link
cordova plugin add ../../purchasely-google/ --link