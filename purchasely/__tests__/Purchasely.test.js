/**
 * Unit tests for Purchasely.js
 */

// Mock cordova/exec
const mockExec = jest.fn();
jest.mock('cordova/exec', () => mockExec, { virtual: true });

// Mock cordova global
global.cordova = {
  define: {
    moduleMap: {
      'cordova/plugin_list': {
        exports: {
          metadata: {
            'cordova-plugin-purchasely': '5.6.2'
          }
        }
      }
    }
  }
};

// Import the module after mocks are set up
const Purchasely = require('../www/Purchasely');

describe('Purchasely', () => {
  beforeEach(() => {
    mockExec.mockClear();
  });

  describe('Constants', () => {
    describe('LogLevel', () => {
      it('should have correct log level values', () => {
        expect(Purchasely.LogLevel.DEBUG).toBe(0);
        expect(Purchasely.LogLevel.INFO).toBe(1);
        expect(Purchasely.LogLevel.WARN).toBe(2);
        expect(Purchasely.LogLevel.ERROR).toBe(3);
      });
    });

    describe('Attribute', () => {
      it('should have correct attribute values', () => {
        expect(Purchasely.Attribute.FIREBASE_APP_INSTANCE_ID).toBe(0);
        expect(Purchasely.Attribute.AIRSHIP_CHANNEL_ID).toBe(1);
        expect(Purchasely.Attribute.ADJUST_ID).toBe(4);
        expect(Purchasely.Attribute.APPSFLYER_ID).toBe(5);
        expect(Purchasely.Attribute.AMPLITUDE_USER_ID).toBe(16);
        expect(Purchasely.Attribute.BATCH_CUSTOM_USER_ID).toBe(20);
        // ENM-02 / REC-11
        expect(Purchasely.Attribute.ONESIGNAL_USER_ID).toBe(21);
        expect(Purchasely.Attribute.oneSignalPlayerId).toBeUndefined();
      });
    });

    describe('DataProcessingLegalBasis', () => {
      it('should have correct legal basis values', () => {
        expect(Purchasely.DataProcessingLegalBasis.essential).toBe('ESSENTIAL');
        expect(Purchasely.DataProcessingLegalBasis.optional).toBe('OPTIONAL');
      });
    });

    describe('DataProcessingPurpose', () => {
      it('should have correct purpose values', () => {
        expect(Purchasely.DataProcessingPurpose.allNonEssentials).toBe('ALL_NON_ESSENTIALS');
        expect(Purchasely.DataProcessingPurpose.analytics).toBe('ANALYTICS');
        expect(Purchasely.DataProcessingPurpose.identifiedAnalytics).toBe('IDENTIFIED_ANALYTICS');
        expect(Purchasely.DataProcessingPurpose.campaigns).toBe('CAMPAIGNS');
        expect(Purchasely.DataProcessingPurpose.personalization).toBe('PERSONALIZATION');
        expect(Purchasely.DataProcessingPurpose.thirdPartyIntegrations).toBe('THIRD_PARTY_INTEGRATIONS');
      });
    });

    describe('PurchaseResult', () => {
      it('should have correct purchase result values', () => {
        expect(Purchasely.PurchaseResult.PURCHASED).toBe(0);
        expect(Purchasely.PurchaseResult.CANCELLED).toBe(1);
        expect(Purchasely.PurchaseResult.RESTORED).toBe(2);
      });
    });

    describe('SubscriptionSource', () => {
      it('should have correct subscription source values', () => {
        expect(Purchasely.SubscriptionSource.appleAppStore).toBe(0);
        expect(Purchasely.SubscriptionSource.googlePlayStore).toBe(1);
        expect(Purchasely.SubscriptionSource.amazonAppstore).toBe(2);
        expect(Purchasely.SubscriptionSource.huaweiAppGallery).toBe(3);
        expect(Purchasely.SubscriptionSource.none).toBe(4);
      });
    });

    describe('PlanType', () => {
      it('should have correct plan type values', () => {
        expect(Purchasely.PlanType.consumable).toBe(0);
        expect(Purchasely.PlanType.nonConsumable).toBe(1);
        expect(Purchasely.PlanType.autoRenewingSubscription).toBe(2);
        expect(Purchasely.PlanType.nonRenewingSubscription).toBe(3);
        expect(Purchasely.PlanType.unknown).toBe(4);
      });
    });

    describe('RunningMode', () => {
      it('should expose the Purchasely 6.0 running modes by name', () => {
        expect(Purchasely.RunningMode.observer).toBe('observer');
        expect(Purchasely.RunningMode.full).toBe('full');
      });
    });

    describe('PresentationAction', () => {
      it('should have correct presentation action values', () => {
        expect(Purchasely.PresentationAction.close).toBe('close');
        expect(Purchasely.PresentationAction.close_all).toBe('close_all');
        expect(Purchasely.PresentationAction.login).toBe('login');
        expect(Purchasely.PresentationAction.navigate).toBe('navigate');
        expect(Purchasely.PresentationAction.purchase).toBe('purchase');
        expect(Purchasely.PresentationAction.restore).toBe('restore');
        expect(Purchasely.PresentationAction.open_presentation).toBe('open_presentation');
        expect(Purchasely.PresentationAction.open_placement).toBe('open_placement');
        expect(Purchasely.PresentationAction.promo_code).toBe('promo_code');
        expect(Purchasely.PresentationAction.web_checkout).toBe('web_checkout');
      });
    });

    describe('InterceptResult', () => {
      it('should have correct intercept result values', () => {
        expect(Purchasely.InterceptResult.success).toBe('success');
        expect(Purchasely.InterceptResult.failed).toBe('failed');
        expect(Purchasely.InterceptResult.notHandled).toBe('notHandled');
      });
    });

    describe('PresentationType', () => {
      it('should have correct presentation type values', () => {
        expect(Purchasely.PresentationType.normal).toBe(0);
        expect(Purchasely.PresentationType.fallback).toBe(1);
        expect(Purchasely.PresentationType.deactivated).toBe(2);
        expect(Purchasely.PresentationType.client).toBe(3);
      });
    });

    describe('CloseReason', () => {
      it('should have correct close reason values', () => {
        expect(Purchasely.CloseReason.button).toBe('button');
        expect(Purchasely.CloseReason.backSystem).toBe('back_system');
        expect(Purchasely.CloseReason.programmatic).toBe('programmatic');
      });
    });

    describe('TransitionType', () => {
      it('should have correct transition type values', () => {
        expect(Purchasely.TransitionType.fullScreen).toBe('fullScreen');
        expect(Purchasely.TransitionType.modal).toBe('modal');
        expect(Purchasely.TransitionType.drawer).toBe('drawer');
        expect(Purchasely.TransitionType.popin).toBe('popin');
        expect(Purchasely.TransitionType.push).toBe('push');
        expect(Purchasely.TransitionType.inlinePaywall).toBe('inlinePaywall');
      });
    });

    describe('DimensionType', () => {
      it('should have correct dimension type values', () => {
        expect(Purchasely.DimensionType.pixel).toBe('pixel');
        expect(Purchasely.DimensionType.percentage).toBe('percentage');
      });
    });

    describe('Store', () => {
      it('should have correct store values', () => {
        expect(Purchasely.Store.google).toBe('Google');
        expect(Purchasely.Store.huawei).toBe('Huawei');
        expect(Purchasely.Store.amazon).toBe('Amazon');
      });
    });

    describe('StorekitVersion', () => {
      it('should have correct storekit version values', () => {
        expect(Purchasely.StorekitVersion.storeKit1).toBe('storeKit1');
        expect(Purchasely.StorekitVersion.storeKit2).toBe('storeKit2');
      });
    });

    describe('ThemeMode', () => {
      it('should have correct theme mode values', () => {
        expect(Purchasely.ThemeMode.light).toBe(0);
        expect(Purchasely.ThemeMode.dark).toBe(1);
        expect(Purchasely.ThemeMode.system).toBe(2);
      });
    });

    describe('UserAttributeAction', () => {
      it('should have correct user attribute action values', () => {
        expect(Purchasely.UserAttributeAction.ADD).toBe('add');
        expect(Purchasely.UserAttributeAction.REMOVE).toBe('remove');
      });
    });
  });

  describe('start', () => {
    it('should call exec with a single options object (with sdkVersion appended)', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.start(
        {
          apiKey: 'API_KEY',
          stores: [Purchasely.Store.google],
          storeKit1: false,
          appUserId: 'user123',
          logLevel: Purchasely.LogLevel.INFO,
          runningMode: Purchasely.RunningMode.full
        },
        success,
        error
      );

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'start',
        [
          {
            apiKey: 'API_KEY',
            stores: ['Google'],
            storeKit1: false,
            appUserId: 'user123',
            logLevel: 1,
            runningMode: 'full',
            sdkVersion: '5.6.2'
          }
        ]
      );
    });

    it('should fall back to the literal default sdkVersion when plugin_list metadata is missing', () => {
      const metadata = global.cordova.define.moduleMap['cordova/plugin_list'].exports.metadata;
      const original = metadata['cordova-plugin-purchasely'];
      delete metadata['cordova-plugin-purchasely'];

      try {
        Purchasely.start({ apiKey: 'API_KEY' }, jest.fn(), jest.fn());

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'start',
          [{ apiKey: 'API_KEY', sdkVersion: '6.0.0-rc.3' }]
        );
      } finally {
        metadata['cordova-plugin-purchasely'] = original;
      }
    });

    it('should treat a v5-style positional call as broken (no longer supported)', () => {
      // Purchasely 6.0: `start` takes a single options object. A v5-style positional
      // call (apiKey, stores, storeKit1, ...) is NOT supported: `options` becomes the
      // raw apiKey string (sdkVersion silently fails to attach to a string primitive),
      // and `success`/`error` are mis-bound to the 2nd/3rd positional args instead of
      // the real callbacks. This documents the breaking change from MIGRATION-v6.md.
      const legacyStores = ['Google'];
      const legacyStoreKit1 = false;

      Purchasely.start('API_KEY', legacyStores, legacyStoreKit1, null, 0, 'full', jest.fn(), jest.fn());

      expect(mockExec).toHaveBeenCalledWith(
        legacyStores,
        legacyStoreKit1,
        'Purchasely',
        'start',
        ['API_KEY']
      );
    });
  });

  describe('addEventListener (canonical, REC-18/PAR-18)', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.addEventListener(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'addEventsListener', []);
    });
  });

  describe('addEventsListener (deprecated alias)', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.addEventsListener(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'addEventsListener', []);
    });
  });

  describe('addUserAttributeListener', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.addUserAttributeListener(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'addUserAttributeListener', []);
    });
  });

  describe('removeEventListener (canonical, REC-18/PAR-18)', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.removeEventListener();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'removeEventsListener',
        []
      );
    });
  });

  describe('removeEventsListener (deprecated alias)', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.removeEventsListener();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'removeEventsListener',
        []
      );
    });
  });

  describe('removeUserAttributeListener', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.removeUserAttributeListener();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'removeUserAttributeListener',
        []
      );
    });
  });

  describe('getAnonymousUserId', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.getAnonymousUserId(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'getAnonymousUserId', []);
    });
  });

  describe('isAnonymous (REC-12 / PAR-04)', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.isAnonymous(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'isAnonymous', []);
    });
  });

  describe('userLogin', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();

      Purchasely.userLogin('user123', success);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        expect.any(Function),
        'Purchasely',
        'userLogin',
        ['user123']
      );
    });
  });

  describe('userLogout', () => {
    it('defaults clearUserAttributes to true when omitted (PAR-30)', () => {
      Purchasely.userLogout();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'userLogout',
        [true]
      );
    });

    it('forwards an explicit clearUserAttributes value', () => {
      Purchasely.userLogout(false);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'userLogout',
        [false]
      );
    });
  });

  describe('setLogLevel', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.setLogLevel(Purchasely.LogLevel.DEBUG);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'setLogLevel',
        [0]
      );
    });
  });

  describe('setAttribute', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.setAttribute(Purchasely.Attribute.FIREBASE_APP_INSTANCE_ID, 'firebase123');

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'setAttribute',
        [0, 'firebase123']
      );
    });
  });

  describe('allowDeeplink', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.allowDeeplink(true);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'allowDeeplink',
        [true]
      );
    });
  });

  describe('allowCampaigns', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.allowCampaigns(false);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'allowCampaigns',
        [false]
      );
    });
  });

  describe('setDefaultPresentationDismissHandler', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.setDefaultPresentationDismissHandler(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'setDefaultPresentationDismissHandler', []);
    });
  });

  describe('synchronize', () => {
    it('should call exec with the provided callbacks', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.synchronize(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'synchronize', []);
    });

    it('should default callbacks when none provided', () => {
      Purchasely.synchronize();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'synchronize',
        []
      );
    });
  });

  // Purchasely 6.0: the v5 presentation surface (fetchPresentation*, presentPresentation*,
  // backPresentation) is REMOVED, replaced by the promise-based v6 builder
  // (Purchasely.presentation), which re-wraps the very same native exec actions.
  describe('presentation builder (v6)', () => {
    // Grabs the exec() call for a given native action, most recent first.
    const execCallFor = (action) => {
      const calls = mockExec.mock.calls.filter((c) => c[3] === action);
      return calls[calls.length - 1];
    };

    // normalizePresentation always returns this exact whitelist of documented fields
    // (defaulting the ones the raw payload didn't carry to null); tests merge in the
    // fields they care about rather than repeating the full shape each time.
    const fullPresentation = (overrides) => ({
      screenId: null,
      placementId: null,
      contentId: null,
      audienceId: null,
      abTestId: null,
      abTestVariantId: null,
      campaignId: null,
      flowId: null,
      language: null,
      type: null,
      plans: null,
      metadata: null,
      height: null,
      ...overrides,
    });

    describe('sources', () => {
      it('.placement(id).build().display() calls presentPresentationForPlacement', async () => {
        const outcomePromise = Purchasely.presentation.placement('placement1').build().display();

        const call = execCallFor('presentPresentationForPlacement');
        expect(call[4]).toEqual(['placement1', null, undefined]);
        call[0]({ purchaseResult: null, plan: null, closeReason: 'button', error: null, presentation: null });

        const outcome = await outcomePromise;
        expect(outcome.closeReason).toBe('button');
      });

      it('.screen(id).build().display() calls presentPresentationWithIdentifier', async () => {
        const outcomePromise = Purchasely.presentation.screen('screen1').build().display();

        const call = execCallFor('presentPresentationWithIdentifier');
        expect(call[4]).toEqual(['screen1', null, undefined]);
        call[0]({ purchaseResult: null, plan: null, closeReason: 'programmatic', error: null, presentation: null });

        await outcomePromise;
      });

      it('.defaultSource().build().display() calls presentPresentationForDefault', async () => {
        const outcomePromise = Purchasely.presentation.defaultSource().build().display();

        const call = execCallFor('presentPresentationForDefault');
        expect(call[4]).toEqual([null, undefined]);
        call[0]({ purchaseResult: null, plan: null, closeReason: 'button', error: null, presentation: null });

        await outcomePromise;
      });

      it('.default() is an alias of .defaultSource()', async () => {
        const outcomePromise = Purchasely.presentation.default().build().display();

        const call = execCallFor('presentPresentationForDefault');
        expect(call[4]).toEqual([null, undefined]);
        call[0]({ purchaseResult: null, plan: null, closeReason: 'button', error: null, presentation: null });

        await outcomePromise;
      });
    });

    describe('contentId', () => {
      it('is forwarded to the matching present* action', async () => {
        const outcomePromise = Purchasely.presentation.placement('placement1').contentId('content1').build().display();

        const call = execCallFor('presentPresentationForPlacement');
        expect(call[4]).toEqual(['placement1', 'content1', undefined]);
        call[0]({ closeReason: 'button' });

        await outcomePromise;
      });
    });

    describe('display(transition)', () => {
      it('normalizes a display-mode string to a transition object', async () => {
        const outcomePromise = Purchasely.presentation.screen('screen1').build().display(Purchasely.TransitionType.drawer);

        const call = execCallFor('presentPresentationWithIdentifier');
        expect(call[4][2]).toEqual({ type: 'drawer' });
        call[0]({ closeReason: 'button' });

        await outcomePromise;
      });

      it('passes a full transition object through unchanged', async () => {
        const transition = { type: 'drawer', dismissible: false, height: { type: 'percentage', value: 0.8 } };
        const outcomePromise = Purchasely.presentation.placement('placement1').build().display(transition);

        const call = execCallFor('presentPresentationForPlacement');
        expect(call[4][2]).toEqual(transition);
        call[0]({ closeReason: 'button' });

        await outcomePromise;
      });
    });

    describe('backgroundColor', () => {
      it('merges into the transition object on the direct present* path (no forced type)', async () => {
        const outcomePromise = Purchasely.presentation
          .placement('placement1')
          .backgroundColor('#101010')
          .build()
          .display();

        const call = execCallFor('presentPresentationForPlacement');
        // No display-mode given: only backgroundColor, no `type`, so the backend
        // transition default is still honored (CDV-W-12).
        expect(call[4][2]).toEqual({ backgroundColor: '#101010' });
        call[0]({ closeReason: 'button' });
        await outcomePromise;
      });

      it('is forwarded as presentPresentation\'s native backgroundColor arg on the re-display path', async () => {
        const request = Purchasely.presentation.screen('screen1').backgroundColor('#202020').build();

        const preloadPromise = request.preload();
        const rawFetched = { screenId: 'screen1', fetchId: 'ply_fetch_789' };
        execCallFor('fetchPresentation')[0](rawFetched);
        await preloadPromise;

        const outcomePromise = request.display();
        const displayCall = execCallFor('presentPresentation');
        expect(displayCall[4][0]).toBe(rawFetched);
        expect(displayCall[4][2]).toBe('#202020');
        displayCall[0]({ closeReason: 'programmatic' });
        await outcomePromise;
      });

      it('does not expose progressColor / displayCloseButton / displayBackButton (no Cordova native support)', () => {
        const builder = Purchasely.presentation.placement('placement1');
        expect(builder.progressColor).toBeUndefined();
        expect(builder.displayCloseButton).toBeUndefined();
        expect(builder.displayBackButton).toBeUndefined();
      });
    });

    describe('lifecycle callbacks', () => {
      it('routes presented/closeRequested envelopes to the builder callbacks, and the final outcome to onDismissed + the resolved promise', async () => {
        const onPresented = jest.fn();
        const onCloseRequested = jest.fn();
        const onDismissed = jest.fn();

        const outcomePromise = Purchasely.presentation
          .placement('placement1')
          .onPresented(onPresented)
          .onCloseRequested(onCloseRequested)
          .onDismissed(onDismissed)
          .build()
          .display();

        const call = execCallFor('presentPresentationForPlacement');
        const dispatch = call[0];
        dispatch({ event: 'presented', presentation: { screenId: 's' } });
        dispatch({ event: 'closeRequested' });
        dispatch({ purchaseResult: 'cancelled', plan: null, closeReason: 'button', error: null, presentation: { screenId: 's' } });

        const outcome = await outcomePromise;

        // The 'presented' envelope's presentation is screenId-normalized like everywhere else.
        expect(onPresented).toHaveBeenCalledWith(fullPresentation({ screenId: 's' }), null);
        expect(onCloseRequested).toHaveBeenCalledTimes(1);
        expect(onDismissed).toHaveBeenCalledWith(outcome);
        expect(outcome).toEqual({
          presentation: fullPresentation({ screenId: 's' }),
          purchaseResult: 'cancelled',
          plan: null,
          closeReason: 'button',
          error: null,
        });
      });
    });

    describe('outcome normalization (5 fields)', () => {
      it('exposes exactly presentation/purchaseResult/plan/closeReason/error, with screenId tolerance', async () => {
        const outcomePromise = Purchasely.presentation.placement('placement1').build().display();

        const call = execCallFor('presentPresentationForPlacement');
        call[0]({
          result: 1, // legacy field: not part of the v6 builder's outcome contract
          purchaseResult: 'purchased',
          plan: { name: 'Plus' },
          closeReason: null,
          error: null,
          presentation: { id: 'screen-id-only' }, // no screenId key: exercises the fallback
        });

        const outcome = await outcomePromise;
        expect(outcome).toEqual({
          presentation: fullPresentation({ screenId: 'screen-id-only' }),
          purchaseResult: 'purchased',
          plan: { name: 'Plus' },
          closeReason: null,
          error: null,
        });
        expect(outcome.result).toBeUndefined();
      });

      it('synthesizes an outcome carrying `error` when the native call fails, without rejecting', async () => {
        const outcomePromise = Purchasely.presentation.placement('placement1').build().display();

        const call = execCallFor('presentPresentationForPlacement');
        call[1]('Presentation not loaded'); // native error callback

        const outcome = await outcomePromise;
        expect(outcome.error).toBe('Presentation not loaded');
        expect(outcome.presentation).toBeNull();
        expect(outcome.closeReason).toBeNull();
      });
    });

    describe('preload() -> display() re-display', () => {
      it('preload() resolves a screenId-normalized presentation, and the follow-up display() re-displays it via presentPresentation carrying the native handle', async () => {
        const request = Purchasely.presentation.placement('placement1').build();

        const preloadPromise = request.preload();
        const fetchCall = execCallFor('fetchPresentation');
        expect(fetchCall[4]).toEqual(['placement1', null, null]);

        const rawFetched = { screenId: 'onboarding-screen', placementId: 'placement1', fetchId: 'ply_fetch_123' };
        fetchCall[0](rawFetched);

        const presentation = await preloadPromise;
        // The screenId-normalized data is present (methods are added on top, below).
        expect(presentation).toMatchObject(fullPresentation({ screenId: 'onboarding-screen', placementId: 'placement1' }));
        // The native re-display handle is never exposed on the returned object.
        expect(presentation.fetchId).toBeUndefined();
        expect(presentation.id).toBeUndefined();

        const outcomePromise = request.display();
        const displayCall = execCallFor('presentPresentation');
        // The exact raw fetch payload (with its private handle) is forwarded as-is.
        expect(displayCall[4][0]).toBe(rawFetched);
        displayCall[0]({ closeReason: 'programmatic' });

        const outcome = await outcomePromise;
        expect(outcome.closeReason).toBe('programmatic');
      });

      it('the loaded presentation exposes display()/close()/back() delegating to its request', async () => {
        const request = Purchasely.presentation.screen('screen1').build();

        const preloadPromise = request.preload();
        const rawFetched = { screenId: 'screen1', fetchId: 'ply_fetch_456' };
        execCallFor('fetchPresentation')[0](rawFetched);

        const loaded = await preloadPromise;
        expect(typeof loaded.display).toBe('function');
        expect(typeof loaded.close).toBe('function');
        expect(typeof loaded.back).toBe('function');

        // display() on the loaded object re-displays via the same request/handle.
        const outcomePromise = loaded.display();
        const displayCall = execCallFor('presentPresentation');
        expect(displayCall[4][0]).toBe(rawFetched);
        displayCall[0]({ closeReason: 'programmatic' });
        await outcomePromise;

        // close() / back() delegate to the request's native actions.
        loaded.close();
        expect(execCallFor('closeAllScreens')).toBeDefined();
        loaded.back();
        expect(execCallFor('backPresentation')).toBeDefined();
      });

      it('rejects preload() on native failure', async () => {
        const request = Purchasely.presentation.screen('screen1').build();
        const preloadPromise = request.preload();

        const fetchCall = execCallFor('fetchPresentation');
        fetchCall[1]('Screen not found');

        await expect(preloadPromise).rejects.toEqual({ message: 'Screen not found' });
      });

      // Android asymmetry regression (v6 audit): onPresented/onCloseRequested previously only
      // fired on the direct present* path. The re-display action (presentPresentation, reached
      // via preload() -> display()) must route the very same keep-alive envelopes to the
      // builder's callbacks, resolving the display() Promise only once the final (non-kept)
      // outcome envelope arrives -- envelopes strictly before resolution.
      it('routes presented/closeRequested envelopes on the preload() -> display() path too, resolving only at the final outcome', async () => {
        const onPresented = jest.fn();
        const onCloseRequested = jest.fn();
        const order = [];
        onPresented.mockImplementation(() => order.push('presented'));
        onCloseRequested.mockImplementation(() => order.push('closeRequested'));

        const request = Purchasely.presentation
          .screen('screen1')
          .onPresented(onPresented)
          .onCloseRequested(onCloseRequested)
          .build();

        const preloadPromise = request.preload();
        const rawFetched = { screenId: 'screen1', fetchId: 'ply_fetch_789' };
        execCallFor('fetchPresentation')[0](rawFetched);
        await preloadPromise;

        const outcomePromise = request.display();
        const displayCall = execCallFor('presentPresentation');
        const dispatch = displayCall[0];

        dispatch({ event: 'presented', presentation: { screenId: 'screen1' } });
        dispatch({ event: 'closeRequested' });
        expect(order).toEqual(['presented', 'closeRequested']);
        // Neither envelope resolves the Promise -- only the final outcome does.
        let settled = false;
        outcomePromise.then(() => { settled = true; });
        await Promise.resolve();
        expect(settled).toBe(false);
        order.push('outcome-dispatched');

        dispatch({ closeReason: 'button', presentation: { screenId: 'screen1' } });
        const outcome = await outcomePromise;

        // Envelopes fired strictly before the Promise resolved.
        expect(order).toEqual(['presented', 'closeRequested', 'outcome-dispatched']);
        expect(onPresented).toHaveBeenCalledWith(fullPresentation({ screenId: 'screen1' }), null);
        expect(onCloseRequested).toHaveBeenCalledTimes(1);
        expect(outcome.closeReason).toBe('button');
      });
    });

    describe('display() direct (no prior preload())', () => {
      it('calls the matching present* action directly, without ever calling fetchPresentation', async () => {
        mockExec.mockClear();
        const outcomePromise = Purchasely.presentation.screen('screen1').build().display();

        expect(mockExec.mock.calls.some((c) => c[3] === 'fetchPresentation')).toBe(false);
        expect(mockExec.mock.calls.some((c) => c[3] === 'presentPresentationWithIdentifier')).toBe(true);

        const call = execCallFor('presentPresentationWithIdentifier');
        call[0]({ closeReason: 'button' });
        await outcomePromise;
      });
    });

    describe('request.close()', () => {
      it('delegates to closeAllScreens (current bridge semantics)', () => {
        mockExec.mockClear();
        const request = Purchasely.presentation.placement('placement1').build();

        request.close();

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'closeAllScreens',
          []
        );
      });
    });

    describe('request.back()', () => {
      it('calls exec with the backPresentation native action', () => {
        mockExec.mockClear();
        const request = Purchasely.presentation.placement('placement1').build();

        request.back();

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'backPresentation',
          []
        );
      });
    });
  });

  describe('removeDefaultPresentationDismissHandler', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.removeDefaultPresentationDismissHandler();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'removeDefaultPresentationDismissHandler',
        []
      );
    });
  });

  describe('purchaseWithPlanVendorId', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.purchaseWithPlanVendorId('plan1', 'offer1', 'content1', success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'purchaseWithPlanVendorId',
        ['plan1', 'offer1', 'content1']
      );
    });
  });

  describe('restoreAllProducts', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.restoreAllProducts(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'restoreAllProducts', []);
    });
  });

  describe('silentRestoreAllProducts', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.silentRestoreAllProducts(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'silentRestoreAllProducts', []);
    });
  });

  describe('purchasedSubscription', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.purchasedSubscription(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'purchasedSubscription', []);
    });
  });

  describe('handleDeeplink', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.handleDeeplink('https://example.com/deeplink', success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'handleDeeplink',
        ['https://example.com/deeplink']
      );
    });
  });

  describe('allProducts', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.allProducts(success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        expect.any(Function),
        'Purchasely',
        'allProducts',
        []
      );
    });
  });

  describe('planWithIdentifier', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();

      Purchasely.planWithIdentifier('plan1', success);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        expect.any(Function),
        'Purchasely',
        'planWithIdentifier',
        ['plan1']
      );
    });
  });

  describe('productWithIdentifier', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();

      Purchasely.productWithIdentifier('product1', success);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        expect.any(Function),
        'Purchasely',
        'productWithIdentifier',
        ['product1']
      );
    });
  });

  // Flush pending microtasks (the interceptor result is reported through a Promise chain).
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  // Returns the native success callback exec() was given for a registerActionInterceptor(kind).
  const nativeInterceptorFor = (kind) => {
    const call = mockExec.mock.calls.find(
      (c) => c[3] === 'registerActionInterceptor' && c[4][0] === kind
    );
    return call && call[0];
  };

  describe('interceptAction (v6 per-action)', () => {
    it('registers a native interceptor for the given kind', () => {
      Purchasely.interceptAction('purchase', jest.fn());

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'registerActionInterceptor',
        ['purchase']
      );
    });

    it('invokes the handler with (info, parameters) and reports its result', async () => {
      const handler = jest.fn().mockReturnValue(Purchasely.InterceptResult.success);
      Purchasely.interceptAction('purchase', handler);
      const nativeSuccess = nativeInterceptorFor('purchase');
      mockExec.mockClear();

      const event = {
        action: 'purchase',
        callbackId: 'purchase#1',
        info: { contentId: 'c1' },
        parameters: { plan: 'p1' },
      };
      nativeSuccess(event);
      await flush();

      expect(handler).toHaveBeenCalledWith(event.info, event.parameters);
      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'completeActionInterceptor',
        ['purchase#1', 'success']
      );
    });

    it('ignores events whose action does not match the registered kind', async () => {
      const handler = jest.fn();
      Purchasely.interceptAction('restore', handler);
      const nativeSuccess = nativeInterceptorFor('restore');

      nativeSuccess({ action: 'purchase', callbackId: 'purchase#2' });
      await flush();

      expect(handler).not.toHaveBeenCalled();
    });

    it('reports failed when the handler throws', async () => {
      Purchasely.interceptAction('purchase', () => { throw new Error('boom'); });
      const nativeSuccess = nativeInterceptorFor('purchase');
      mockExec.mockClear();

      nativeSuccess({ action: 'purchase', callbackId: 'purchase#3' });
      await flush();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'completeActionInterceptor',
        ['purchase#3', 'failed']
      );
    });
  });

  describe('removeActionInterceptor', () => {
    it('unregisters a single kind', () => {
      Purchasely.removeActionInterceptor('purchase');

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'unregisterActionInterceptor',
        ['purchase']
      );
    });
  });

  describe('removeAllActionInterceptors', () => {
    it('unregisters every registered kind', () => {
      Purchasely.interceptAction('purchase', jest.fn());
      Purchasely.interceptAction('restore', jest.fn());
      mockExec.mockClear();

      Purchasely.removeAllActionInterceptors();

      const unregistered = mockExec.mock.calls
        .filter((c) => c[3] === 'unregisterActionInterceptor')
        .map((c) => c[4][0]);
      expect(unregistered).toEqual(expect.arrayContaining(['purchase', 'restore']));
    });
  });

  describe('userDidConsumeSubscriptionContent', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.userDidConsumeSubscriptionContent();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'userDidConsumeSubscriptionContent',
        []
      );
    });
  });

  describe('userSubscriptions', () => {
    it('defaults invalidateCache to false when omitted (PAR-29)', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.userSubscriptions(success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        expect.any(Function),
        'Purchasely',
        'userSubscriptions',
        [false]
      );
    });

    it('forwards an explicit invalidateCache value', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.userSubscriptions(success, error, true);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        expect.any(Function),
        'Purchasely',
        'userSubscriptions',
        [true]
      );
    });
  });

  describe('userSubscriptionsHistory', () => {
    it('defaults invalidateCache to false when omitted (PAR-29)', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.userSubscriptionsHistory(success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        expect.any(Function),
        'Purchasely',
        'userSubscriptionsHistory',
        [false]
      );
    });

    it('forwards an explicit invalidateCache value', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.userSubscriptionsHistory(success, error, true);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        expect.any(Function),
        'Purchasely',
        'userSubscriptionsHistory',
        [true]
      );
    });
  });

  describe('setLanguage', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.setLanguage('fr');

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'setLanguage',
        ['fr']
      );
    });
  });

  describe('closeAllScreens', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.closeAllScreens(success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'closeAllScreens', []);
    });

    it('should default callbacks when none provided', () => {
      Purchasely.closeAllScreens();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'closeAllScreens',
        []
      );
    });
  });

  describe('closePresentation (deprecated alias of closeAllScreens)', () => {
    it('should delegate to closeAllScreens', () => {
      Purchasely.closePresentation();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'closeAllScreens',
        []
      );
    });
  });

  describe('User Attributes', () => {
    describe('setUserAttributeWithString', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.setUserAttributeWithString('name', 'John', 'ESSENTIAL');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'setUserAttributeWithString',
          ['name', 'John', 'ESSENTIAL']
        );
      });
    });

    describe('setUserAttributeWithBoolean', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.setUserAttributeWithBoolean('isPremium', true, 'OPTIONAL');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'setUserAttributeWithBoolean',
          ['isPremium', true, 'OPTIONAL']
        );
      });
    });

    describe('setUserAttributeWithInt', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.setUserAttributeWithInt('age', 25, 'ESSENTIAL');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'setUserAttributeWithInt',
          ['age', 25, 'ESSENTIAL']
        );
      });
    });

    describe('setUserAttributeWithDouble', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.setUserAttributeWithDouble('balance', 99.99, 'ESSENTIAL');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'setUserAttributeWithDouble',
          ['balance', 99.99, 'ESSENTIAL']
        );
      });
    });

    describe('setUserAttributeWithDate', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.setUserAttributeWithDate('birthdate', '1990-01-01', 'ESSENTIAL');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'setUserAttributeWithDate',
          ['birthdate', '1990-01-01', 'ESSENTIAL']
        );
      });
    });

    describe('setUserAttributeWithStringArray', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.setUserAttributeWithStringArray('tags', ['a', 'b'], 'ESSENTIAL');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'setUserAttributeWithStringArray',
          ['tags', ['a', 'b'], 'ESSENTIAL']
        );
      });
    });

    describe('setUserAttributeWithIntArray', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.setUserAttributeWithIntArray('scores', [1, 2, 3], 'ESSENTIAL');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'setUserAttributeWithIntArray',
          ['scores', [1, 2, 3], 'ESSENTIAL']
        );
      });
    });

    describe('setUserAttributeWithDoubleArray', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.setUserAttributeWithDoubleArray('prices', [1.1, 2.2], 'ESSENTIAL');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'setUserAttributeWithDoubleArray',
          ['prices', [1.1, 2.2], 'ESSENTIAL']
        );
      });
    });

    describe('setUserAttributeWithBooleanArray', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.setUserAttributeWithBooleanArray('flags', [true, false], 'ESSENTIAL');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'setUserAttributeWithBooleanArray',
          ['flags', [true, false], 'ESSENTIAL']
        );
      });
    });

    describe('userAttribute', () => {
      it('should call exec with correct parameters', () => {
        const success = jest.fn();
        const error = jest.fn();

        Purchasely.userAttribute('name', success, error);

        expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'userAttribute', ['name']);
      });
    });

    describe('clearUserAttribute', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.clearUserAttribute('name');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'clearUserAttribute',
          ['name']
        );
      });
    });

    describe('clearUserAttributes', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.clearUserAttributes();

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'clearUserAttributes',
          []
        );
      });
    });

    describe('clearBuiltInAttributes', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.clearBuiltInAttributes();

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'clearBuiltInAttributes',
          []
        );
      });
    });

    describe('getBuiltInAttributes (PAR-07)', () => {
      it('should call exec with correct parameters', () => {
        const success = jest.fn();
        const error = jest.fn();

        Purchasely.getBuiltInAttributes(success, error);

        expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'getBuiltInAttributes', []);
      });
    });

    describe('getBuiltInAttribute (PAR-07)', () => {
      it('should call exec with correct parameters', () => {
        const success = jest.fn();
        const error = jest.fn();

        Purchasely.getBuiltInAttribute('ply_session_count', success, error);

        expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'getBuiltInAttribute', ['ply_session_count']);
      });
    });

    describe('userAttributes (REC-12 / PAR-03)', () => {
      it('should call exec with correct parameters', () => {
        const success = jest.fn();
        const error = jest.fn();

        Purchasely.userAttributes(success, error);

        expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'userAttributes', []);
      });
    });

    describe('incrementUserAttribute (REC-12 / PAR-02)', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.incrementUserAttribute('counter', 5);

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'incrementUserAttribute',
          ['counter', 5]
        );
      });

      it('should forward an omitted value as-is (native defaults it to 1)', () => {
        Purchasely.incrementUserAttribute('counter');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'incrementUserAttribute',
          ['counter', undefined]
        );
      });
    });

    describe('decrementUserAttribute (REC-12 / PAR-02)', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.decrementUserAttribute('counter', 3);

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'decrementUserAttribute',
          ['counter', 3]
        );
      });
    });
  });

  describe('isEligibleForIntroOffer', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.isEligibleForIntroOffer('plan1', success, error);

      expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'isEligibleForIntroOffer', ['plan1']);
    });
  });

  describe('signPromotionalOffer', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.signPromotionalOffer('product1', 'offer1', success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'signPromotionalOffer',
        ['product1', 'offer1']
      );
    });
  });

  describe('setThemeMode', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.setThemeMode(Purchasely.ThemeMode.dark);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'setThemeMode',
        [1]
      );
    });
  });

  describe('revokeDataProcessingConsent', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.revokeDataProcessingConsent(['ANALYTICS', 'CAMPAIGNS']);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'revokeDataProcessingConsent',
        [['ANALYTICS', 'CAMPAIGNS']]
      );
    });
  });

  describe('setDebugMode', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.setDebugMode(true);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'setDebugMode',
        [true]
      );
    });
  });

  describe('Dynamic Offerings (PAR-05)', () => {
    describe('setDynamicOffering', () => {
      it('should call exec with correct parameters', () => {
        const success = jest.fn();
        const error = jest.fn();

        Purchasely.setDynamicOffering('ref_1', 'plan_vendor_id', 'offer_vendor_id', success, error);

        expect(mockExec).toHaveBeenCalledWith(
          success,
          error,
          'Purchasely',
          'setDynamicOffering',
          ['ref_1', 'plan_vendor_id', 'offer_vendor_id']
        );
      });

      it('should forward a null offerVendorId when none is given', () => {
        Purchasely.setDynamicOffering('ref_1', 'plan_vendor_id', null, jest.fn(), jest.fn());

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'setDynamicOffering',
          ['ref_1', 'plan_vendor_id', null]
        );
      });
    });

    describe('getDynamicOfferings', () => {
      it('should call exec with correct parameters', () => {
        const success = jest.fn();
        const error = jest.fn();

        Purchasely.getDynamicOfferings(success, error);

        expect(mockExec).toHaveBeenCalledWith(success, error, 'Purchasely', 'getDynamicOfferings', []);
      });
    });

    describe('removeDynamicOffering', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.removeDynamicOffering('ref_1');

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'removeDynamicOffering',
          ['ref_1']
        );
      });
    });

    describe('clearDynamicOfferings', () => {
      it('should call exec with correct parameters', () => {
        Purchasely.clearDynamicOfferings();

        expect(mockExec).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          'Purchasely',
          'clearDynamicOfferings',
          []
        );
      });
    });
  });

  // Purchasely 6.0: these v5 APIs were deliberately removed (see MIGRATION-v6.md).
  // Asserting their absence guards against accidental resurrection/typos reintroducing
  // a v5-shaped surface alongside the v6 replacements.
  describe('Removed v5 APIs (should not exist in v6)', () => {
    it('removes the presentation methods with no v6 native screen equivalent', () => {
      expect(Purchasely.presentSubscriptions).toBeUndefined();
      expect(Purchasely.presentProductWithIdentifier).toBeUndefined();
      expect(Purchasely.presentPlanWithIdentifier).toBeUndefined();
      expect(Purchasely.showPresentation).toBeUndefined();
      expect(Purchasely.hidePresentation).toBeUndefined();
    });

    // The imperative presentation surface is replaced by the Purchasely.presentation
    // builder (see the 'presentation builder (v6)' suite above).
    it('removes the imperative presentation surface in favor of Purchasely.presentation', () => {
      expect(Purchasely.fetchPresentation).toBeUndefined();
      expect(Purchasely.fetchPresentationForPlacement).toBeUndefined();
      expect(Purchasely.fetchPresentationForDefault).toBeUndefined();
      expect(Purchasely.presentPresentationWithIdentifier).toBeUndefined();
      expect(Purchasely.presentPresentationForPlacement).toBeUndefined();
      expect(Purchasely.presentPresentationForDefault).toBeUndefined();
      expect(Purchasely.presentPresentation).toBeUndefined();
      expect(Purchasely.backPresentation).toBeUndefined();

      expect(typeof Purchasely.presentation.placement).toBe('function');
      expect(typeof Purchasely.presentation.screen).toBe('function');
      expect(typeof Purchasely.presentation.defaultSource).toBe('function');
      expect(typeof Purchasely.presentation.default).toBe('function');
    });

    it('removes the single global action interceptor in favor of interceptAction(kind, handler)', () => {
      expect(Purchasely.setPaywallActionInterceptor).toBeUndefined();
      expect(Purchasely.onProcessAction).toBeUndefined();
      expect(Purchasely.PaywallAction).toBeUndefined();
    });

    it('removes the renamed deeplink methods', () => {
      expect(Purchasely.readyToOpenDeeplink).toBeUndefined();
      expect(Purchasely.isDeeplinkHandled).toBeUndefined();
    });

    it('removes the renamed default dismiss handler', () => {
      expect(Purchasely.setDefaultPresentationResultHandler).toBeUndefined();
    });

    it('removes the RunningMode values dropped by native 6.0', () => {
      expect(Purchasely.RunningMode.paywallObserver).toBeUndefined();
      expect(Purchasely.RunningMode.transactionOnly).toBeUndefined();
      expect(Object.keys(Purchasely.RunningMode).sort()).toEqual(['full', 'observer']);
    });
  });
});
