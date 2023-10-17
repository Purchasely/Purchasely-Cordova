#!/bin/bash

cordova plugin remove @purchasely/cordova-plugin-purchasely
cordova plugin remove @purchasely/cordova-plugin-puchasely-google
cordova platform remove android
cordova platform add android@12.0.1
cordova plugin add ../ --link
cordova plugin add ../../purchasely-google/ --link