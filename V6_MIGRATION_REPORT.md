# Rapport de migration Cordova → Purchasely SDK natif 6.0

> Session sur la branche `feat/sdk-v6-migration`.
> Migration du **plugin Cordova** (bridge JS `cordova.exec()` ↔ natif iOS/Android)
> vers les SDK natifs Purchasely 6.0. Équivalent de ce qui a été fait sur Flutter
> (`../Flutter`) et React Native (`../React_Native`), adapté au style Cordova.

---

## 1. Principe directeur

Le plugin Cordova est un **bridge JS ↔ natif**. Contrairement à RN/Flutter v6 qui
ont introduit une nouvelle API « builder », la couche JavaScript Cordova reste
**méthode‑based et quasi inchangée** : les bridges natifs (iOS Obj‑C, Android
Kotlin) ont été **réécrits pour appeler le SDK v6** derrière les actions
`cordova.exec` existantes. C'est cohérent avec l'intégration documentée
(RN/Flutter/Cordova gardent `fetchPresentation`+`presentPresentation`,
`setPaywallActionInterceptor`+`onProcessAction`, `closePresentation`).

v6 = version **majeure** : pas de couche de compatibilité v5. Les méthodes
renommées (deeplinks, RunningMode) sont renommées sans alias.

Trois zones concentrent les changements natifs : **démarrage du SDK**,
**présentation (fetch/preload/display/close)** et **action interceptor**. Le reste
de la surface (`setUserAttribute*`, produits, abonnements, attributs…) est
inchangé. `synchronize` gagne des callbacks succès/erreur.

---

## 2. Versions épinglées

| Fichier | Avant | Après |
|---|---|---|
| `purchasely/plugin.xml` (plugin version) | `5.7.3` | `6.0.0-rc.1` |
| `purchasely/plugin.xml` (pod iOS) | `Purchasely 5.7.4` | `Purchasely 6.0.0-rc.1` |
| `purchasely/plugin.xml` (Android) | `io.purchasely:core:5.7.4` | `io.purchasely:core:6.0.0-rc.1` |
| `purchasely-google/plugin.xml` (version) | `5.7.3` | `6.0.0-rc.1` |
| `purchasely-google/plugin.xml` (Android) | `io.purchasely:google-play:5.7.4` | `io.purchasely:google-play:6.0.0-rc.1` |
| `purchasely/package.json` | `5.7.3` | `6.0.0-rc.1` |
| `purchasely-google/package.json` | `5.7.3` | `6.0.0-rc.1` |
| `purchasely/www/Purchasely.js` (fallback) | `5.7.3` | `6.0.0-rc.1` |
| `VERSIONS.md` | — | ajout ligne `6.0.0-rc.1 → iOS 6.0.0-rc.1 / Android 6.0.0-rc.1` |

> **Convention de version** : Android (Maven Central) et iOS (CocoaPods) utilisent
> la **même** chaîne `6.0.0-rc.1`. **Piège Gradle** : `6.0.0` (release) est classé
> *au‑dessus* de `6.0.0-rc.1` ; une seule réf `io.purchasely:*:6.0.0` perdue
> remonterait `core` → crash runtime (`NoSuchMethodError`). Vérifié vide :
> `rg "io.purchasely:[a-z-]+:6\.0\.0\b"` (hors `build/`) → aucun match.

> **Historique de la version Android** : l'artefact publié sur **Maven Central**
> est `6.0.0-rc.1` — c'est le pin retenu (confirmé par l'utilisateur). Le
> `mavenLocal` local contenait un `6.0.0-rc1` (sans point, plus ancien) utilisé
> lors des tout premiers builds locaux ; le build final résout `6.0.0-rc.1` depuis
> Maven Central.

---

## 3. Couche JavaScript (`purchasely/www/Purchasely.js`)

- `synchronize()` → `synchronize(success, error)` : callbacks optionnels,
  source‑compatible (`Purchasely.synchronize()` reste valide).
- `readyToOpenDeeplink(bool)` → **`allowDeeplink(bool)`** (action native `allowDeeplink`).
- `isDeeplinkHandled(url, s, e)` → **`handleDeeplink(url, s, e)`** (action native `handleDeeplink`).
- `RunningMode` : `paywallObserver` **supprimé**, remplacé par `observer` (valeur `2`).
- Exemple (`example/www/js/index.js`) mis à jour : `allowDeeplink`, `handleDeeplink`,
  et correction d'un bug pré‑existant `closePaywall()` → `closePresentation()`.

---

## 4. Bridge iOS (`purchasely/src/ios/CDVPurchasely.{h,m}`)

| Zone | v5 | v6 |
|---|---|---|
| **start** | `startWithAPIKey:appUserId:runningMode:paywallActionsInterceptor:storekitSettings:logLevel:initialized:` | `[Purchasely apiKey:…]` → `appUserId:` `runningMode:` `storekitSettings:` `logLevel:` `appTechnology:` `sdkBridgeVersion:` → `startWithInitialized:` (callback `(NSError*)`) |
| **présentation** | `presentationControllerFor:/With:`, `productControllerFor:`, `planControllerFor:` (controller‑returning, **supprimés**) | `PLYPresentationBuilder forPlacementId:/forScreenId:` → `build` → `displayWithCompletion:` / `displayWithTransition:completion:` ; résultat via `onDismissed:` (`PLYPresentationOutcome`) |
| **fetch** | `fetchPresentationFor:/With:…fetchCompletion:completion:` | `PLYPresentationBuilder…build` → `preloadWithCompletion:` ; `presentation.onDismissed = …` ; stockage dans `presentationsLoaded` (`id<PLYPresentation>`) |
| **present (préchargé)** | `presentationLoaded.controller` + `showController:` + `closeDisplayedPresentation` | `[presentationLoaded displayFrom:nil]` (+ `displayFrom:transitionType:[PLYDisplayMode fullScreen]`) |
| **interceptor** | `setPaywallActionsInterceptor:` (global, `onProcessActionHandler(BOOL)`) | `interceptAction:handler:` **par action** (10 actions) renvoyant `PLYInterceptResult` ; `onProcessAction(true)`→`NotHandled`, `(false)`→`Success` |
| **info interceptor** | `PLYPresentationInfo` (champs plats) | `PLYInterceptorInfo` ; ids via `info.presentation.{id,placementId,abTestId,abTestVariantId}` |
| **synchronize** | `synchronizeWithSuccess:failure:` (blocs vides) | mêmes blocs câblés → `successFor:` / `failureFor:` |
| **close/hide/show** | dismiss VC + reopen | `closeAllScreens` (close/hide) ; `showPresentation` ré‑affiche la présentation retenue (`displayedPresentation`) |
| **presentSubscriptions** | `subscriptionsController` + `showController:` | **no‑op** (UI native supprimée) |
| **deeplinks** | `readyToOpenDeeplink:`, `isDeeplinkHandledWithDeeplink:` | `allowDeeplink:`, `handleDeeplink:` |
| **PLYPresentation** | `PLYPresentation *` (classe) | `id<PLYPresentation>` (protocole) |
| **PurchaseResult** | enum `PLYProductViewControllerResult` (purchased=0,cancelled=1,restored=2 → matche JS) gardé pour `setDefaultPresentationResultHandler` | nouveau `resultDictionaryForOutcome:` mappe `PLYPurchaseResult` (cancelled=0,purchased=1,restored=2) **explicitement** vers les codes JS (PURCHASED=0, CANCELLED=1, RESTORED=2) |

`setDefaultPresentationResultHandler:` est **inchangé en v6** (toujours
`PLYProductViewControllerCompletionBlock`) → conservé tel quel.

---

## 5. Bridge Android (`purchasely/src/android/PurchaselyPlugin.kt`)

| Zone | v5 | v6 |
|---|---|---|
| **imports** | `io.purchasely.ext.PLYPresentation*` | `io.purchasely.ext.presentation.*` (`PLYPresentation`, `PLYPresentationAction`, `PLYPresentationType`, `PLYPresentationOutcome`, `PLYPurchaseResult`, `preload`, `display`) + `PLYInterceptResult`, `PLYInterceptorInfo`, `PLYActionInterceptorCallback` |
| **start** | `Builder(...).build()` + `start { isConfigured, error -> }` | `Builder(...).build()` + `start { error -> }` (callback `PLYError?` unique) |
| **runningMode** | `Full` / `PaywallObserver` | `PLYRunningMode.Full` / `PLYRunningMode.Observer` (plus de `PaywallObserver` ; 2→Observer, 3→Full) |
| **fetch** | `Purchasely.fetchPresentation(PLYPresentationProperties)` | `PLYPresentation { placementId()/screenId()/contentId() }.preload { loaded, error -> }` ; map construite à la main |
| **present** | `PLYProductActivity` (custom) + `Purchasely.presentationView` | `PLYPresentation { … }.display(activity) { outcome -> }` ; `presentation.display(activity)` pour le préchargé |
| **interceptor** | `setPaywallActionsInterceptor { info, action, parameters, processAction -> }` | `interceptAction(Class, PLYActionInterceptorCallback)` **par action** ; `result(PLYInterceptResult)` ; params extraits des sous‑classes scellées de `PLYPresentationAction` |
| **synchronize** | `Purchasely.synchronize()` | `synchronize(onSuccess, onError)` câblé aux callbacks JS |
| **setDefaultPresentationResultHandler** | `(PLYProductViewResult, PLYPlan?)` | `(PLYPresentationOutcome)` |
| **deeplinks** | `Purchasely.readyToOpenDeeplink`, `isDeeplinkHandled(uri)` | `Purchasely.allowDeeplink`, `handleDeeplink(uri, activity)` |
| **presentSubscriptions** | `PLYSubscriptionsActivity` | **no‑op** (log) |
| **offres** | `plan.isEligibleToIntroOffer(null)` | `plan.isEligibleToOffer(null)` |
| **sendPurchaseResult** | `(PLYProductViewResult, plan)` | `(PLYPresentationOutcome)` → mapping codes JS |
| **suppressions** | `PLYProductActivity.kt`, `PLYSubscriptionsActivity.java`, layouts + thèmes associés, classe interne `ProductActivity` | supprimés (le natif v6 `display()` remplace le host custom) |

`PurchaselyGoogle.java` (plugin Google) est un stub (`coolMethod`) — aucune API
v5, seul le pin de version change.

---

## 6. Fichiers modifiés / supprimés

**Modifiés :**
- `purchasely/plugin.xml`, `purchasely-google/plugin.xml`
- `purchasely/package.json`, `purchasely-google/package.json`
- `purchasely/www/Purchasely.js`
- `purchasely/src/ios/CDVPurchasely.h`, `purchasely/src/ios/CDVPurchasely.m`
- `purchasely/src/android/PurchaselyPlugin.kt`
- `purchasely/__tests__/Purchasely.test.js`
- `purchasely/example/www/js/index.js`
- `VERSIONS.md`

**Supprimés (Android, remplacés par `display()` natif v6) :**
- `purchasely/src/android/PLYProductActivity.kt`
- `purchasely/src/android/PLYSubscriptionsActivity.java`
- `purchasely/src/android/activity_ply_product_activity.xml`
- `purchasely/src/android/activity_ply_subscriptions_activity.xml`
- `purchasely/src/android/theme_purchasely_fullscreen*.xml`

**Édition cross‑repo NON commitée (machine‑locale) :**
- `/Users/kevin/Purchasely/iOS/Purchasely.podspec` : `3.6.2` → `6.0.0-rc.1`
  (pour que le dev‑pod local satisfasse `pod 'Purchasely', '6.0.0-rc.1'`).
  À revert une fois le pod 6.0 publié sur le trunk.

---

## 7. Vérifications exécutées (preuves)

| Vérification | Commande | Résultat |
|---|---|---|
| Tests JS unitaires | `npx jest` (dans `purchasely/`) | ✅ **68/68** passent (dont nouveaux tests `synchronize(success,error)`, `allowDeeplink`, `handleDeeplink`) |
| Build iOS | `xcodebuild -workspace App.xcworkspace -scheme App -sdk iphonesimulator build` (dev‑pod `Purchasely 6.0.0-rc.1`) | ✅ **BUILD SUCCEEDED**, 0 erreur (le SDK Swift + le bridge Obj‑C `CDVPurchasely.m` compilent) |
| Build Android | `tools/gradlew :app:assembleDebug` (Maven Central `io.purchasely:*:6.0.0-rc.1`) | ✅ **BUILD SUCCESSFUL**, `app-debug.apk` produit |
| Fonctionnel iOS (iPhone 17, iOS 26.5) | install + launch `com.purchasely.demo`, `log stream` | ✅ plugin Purchasely exécuté, **SDK v6 démarré** : appels backend `api.purchasely.io/app/.../configuration` → `.../paab/user_purchases` → `tracking.purchasely.io/.../events`, **0 crash** |
| Fonctionnel Android (Pixel_Tablet émulateur) | install APK + cold launch, `logcat` | ✅ `PluginManager: put - Purchasely / PurchaselyGoogle`, **`D/Purchasely: Init SDK (v.6.0.0-rc.1)`**, `[GooglePlay] Store is connected` (Billing 8.3.0), `Fetching configuration`, **0 crash** |

---

## 8. Doutes / points à reviewer (À LIRE)

1. **Version native Android** — pinné `6.0.0-rc.1` (publié sur **Maven Central**,
   confirmé par l'utilisateur). ✅ résolu.
2. **Version du plugin Cordova** — fixée à `6.0.0-rc.1` (plugin.xml + package.json),
   alignée sur iOS et Android. Décision de release à valider au tag.
3. **Tests natifs** — un plugin Cordova n'a pas de harness de tests natifs
   standalone (contrairement au plugin Flutter qui a une cible RunnerTests). La
   validation native repose sur la **compilation de l'exemple** (intégration) + le
   **run fonctionnel** sur simulateur. Les tests unitaires JS couvrent la surface
   du bridge.
4. **`presentProductWithIdentifier` / `presentPlanWithIdentifier`** — les
   présentations spécifiques produit/plan ont été supprimées du natif v6. Le bridge
   affiche désormais la présentation via son **`screenId`** (le 2ᵉ argument JS,
   anciennement « presentationId ») — une présentation s'identifie par `placementId`
   **ou** `screenId`. Plus d'erreur bloquante.
5. **`showPresentation` / `hidePresentation`** — v6 n'a pas de primitif natif
   hide/show. Le bridge **retient la dernière présentation affichée**
   (`displayedPresentation`) : `hidePresentation` = `closeAllScreens`,
   `showPresentation` la **ré‑affiche**. À valider runtime sur un placement live.
6. **`isFullscreen`** — en v6 la transition est pilotée par la Console ; le
   paramètre `isFullscreen` est désormais surtout informatif côté natif (iOS force
   `[PLYDisplayMode fullScreen]` quand `true` ; Android ignore et suit la Console).
7. **`loadingBackgroundColor`** (param de `presentPresentation`) — n'a plus d'effet
   en v6 (la présentation est déjà rendue au moment de l'affichage).
8. **`signPromotionalOffer` Android** — renvoie « No signing required on Android »
   (comportement pré‑existant ; offres promo Apple = iOS only).
9. **Toolchain Android** — le SDK natif v6 exige Kotlin 2.2.21 + compileSdk 36 +
   AGP ≥ 8.9, que `cordova-android@14` ne fournit pas par défaut (Kotlin 2.1.21 /
   AGP 8.7.3 / compileSdk 35). Le build a nécessité des bumps (cf. §9). **À décider** :
   documenter ces prérequis pour les apps clientes (préférences `config.xml`) et/ou
   relever les minimums dans la doc d'intégration Cordova v6.
10. **Affichage de présentation non confirmé visuellement** — l'init v6 est prouvé au
    runtime sur les deux plateformes, mais l'affichage d'un paywall n'a pas été
    observé (taps WebView synthétiques non pris + placement de démo app‑spécifique).
    À revérifier manuellement sur un placement live. Le code d'affichage compile et
    utilise des API v6 vérifiées.

---

## 9. Détails build & environnement

**iOS** (Xcode 26.5, CocoaPods 1.16.2, iPhone 17 / iOS 26.5) :
1. `cordova platform add ios` + `cordova plugin add ../ --link`.
2. Podfile machine‑local : `pod 'Purchasely', :path => '/Users/kevin/Purchasely/iOS'`
   (le pod `6.0.0-rc.1` n'est pas publié sur trunk) ; `platform :ios, '13.4'`
   (le podspec exige 13.4) + post_install alignant `IPHONEOS_DEPLOYMENT_TARGET`.
3. `pod install` (compile le SDK Purchasely depuis la source) → OK.
4. `xcodebuild -workspace App.xcworkspace -scheme App -sdk iphonesimulator build` → **BUILD SUCCEEDED**.
   - **1 correctif trouvé par le compilateur** : `PLYPresentationRequest` est un
     **protocole** Obj‑C en v6 → `id<PLYPresentationRequest>` (et non
     `PLYPresentationRequest *`). Corrigé dans `displayBuilder:` et `fetchPresentation:`.

**Android** (JDK 21, Android SDK 36, émulateur Pixel_Tablet) :
1. `cordova platform add android` + `cordova plugin add ../ --link`.
2. `core:6.0.0-rc.1` exige **kotlin‑stdlib 2.2.21** ; cordova‑android 14 fournit
   Kotlin 2.1.21 / AGP 8.7.3 / compileSdk 35. Réglages machine‑locaux dans
   `platforms/android/cdv-gradle-config.json` : `KOTLIN_VERSION 2.2.21`,
   `COMPILE_SDK_VERSION 36`, `AGP_VERSION 8.9.2`, `MIN_BUILD_TOOLS_VERSION 36.0.0`.
3. `io.purchasely:*:6.0.0-rc.1` résolu depuis **Maven Central** (`mavenCentral()`
   déjà présent). `mavenLocal()` a été ajouté dans
   **`platforms/android/app/repositories.gradle`** (l'app module lit le sien, pas
   celui de la racine) lors des premiers essais avec l'artefact local `6.0.0-rc1` ;
   il est désormais superflu pour `rc.1` mais inoffensif.
4. Wrapper Gradle : cordova‑android 14 met le wrapper dans `tools/` ; généré à 8.13
   via `gradle -p tools wrapper --gradle-version 8.13` (le gradle système est 9.5 /
   Groovy 4, incompatible avec les scripts cordova Groovy‑3 → erreur `XmlParser`).
5. `tools/gradlew :app:assembleDebug` → **BUILD SUCCESSFUL**, `app-debug.apk`.

**Affichage d'une présentation (display)** : l'init runtime est prouvé sur les deux
plateformes (cf. table §7). L'affichage **visuel** d'un paywall n'a pas pu être
confirmé dans cette session : les taps synthétiques (`adb shell input tap`) ne sont
pas pris en compte par la WebView Cordova de l'exemple, et le placement `ONBOARDING`
de l'exemple dépend de la configuration Console de la clé API de démo (non
contrôlable ici). Le chemin d'affichage **compile proprement** sur les deux
plateformes et utilise des API v6 vérifiées (`display(activity)` Android,
`displayFrom:` / `displayWithCompletion:` iOS) ; il **évite structurellement** le
crash `PLYTransition` rencontré sur Flutter (aucune construction manuelle de
transition). Vérification manuelle recommandée avec un placement live.

> Ces réglages de toolchain Android sont **machine‑locaux** (`platforms/` est
> régénéré par cordova) et ne sont **pas commités**. Pour un build reproductible /
> CI, ils sont à déclarer en `config.xml` (préférences `android-compileSdkVersion`,
> `AndroidGradlePluginVersion`, `GradlePluginKotlinVersion`, `GradleVersion`) — voir
> le `README.md` (section « Requirements (SDK v6) »). Les artefacts `io.purchasely:*`
> `6.0.0-rc.1` étant sur **Maven Central**, aucun `mavenLocal` n'est requis.

---

## 10. Pour mettre à jour `../Documentation` et `../purchasely-ai-skill`

- `purchasely-ai-skill/references/cordova/integration.md` : passer les snippets v5
  à v6 — `RunningMode.observer`, `allowDeeplink`/`handleDeeplink`,
  `synchronize(success,error)`, `presentSubscriptions` no‑op, pins
  `6.0.0-rc.1` / `6.0.0-rc.1`.
- Créer `purchasely-ai-skill/references/cordova/migration-v6.md` (miroir de
  `MIGRATION-v6.md`).
- `purchasely-ai-skill/references/sdk-versions.md` : Cordova `5.7.3` → `6.0.0-rc.1`,
  natifs iOS `6.0.0-rc.1` / Android `6.0.0-rc.1`.
- Docs publiques (`../Documentation`) : guide d'intégration Cordova + guide de
  migration 5→6 Cordova, en miroir des guides Android/iOS/RN/Flutter.
