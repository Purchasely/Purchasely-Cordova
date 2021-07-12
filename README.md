# Purchasely-Cordova-Sources

## Add plugin :

`cd example/`

`cordova plugin add /home/kevin/Documents/Purchasely/Cordova/Purchasely --link`


## Add android platform :

`cd example/`

`cordova platform add android`

### Add Google-Play dependencies

In folder `example/platforms/android/app` create a file called `build-extras.gradle` and add thoses lines :
```groovy
dependencies {
    implementation "io.purchasely:google-play:2.5.3"
}
```

### Troubleshot

`cd example/`

`cordova platform remove android`

`cordova plugin remove cordova-plugin-purchasely`
