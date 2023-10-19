#!/bin/bash

cordova plugin remove @purchasely/cordova-plugin-purchasely
cordova platform remove ios
cordova platform add ios@7.0.1
cordova plugin add ../ --link