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

  describe('addEventsListener', () => {
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

  describe('removeEventsListener', () => {
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
    it('should call exec with correct parameters', () => {
      Purchasely.userLogout();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'userLogout',
        []
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

  describe('presentPresentationWithIdentifier', () => {
    it('should pass a display-mode string as a transition object', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.presentPresentationWithIdentifier('presentation1', 'content1', Purchasely.TransitionType.drawer, success, error);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        error,
        'Purchasely',
        'presentPresentationWithIdentifier',
        ['presentation1', 'content1', { type: 'drawer' }]
      );
    });

    it('should normalize a legacy isFullscreen=true to fullScreen', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.presentPresentationWithIdentifier('presentation1', 'content1', true, success, error);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        error,
        'Purchasely',
        'presentPresentationWithIdentifier',
        ['presentation1', 'content1', { type: 'fullScreen' }]
      );
    });

    it('should pass a full transition object (dimensions/dismissible) through unchanged', () => {
      const success = jest.fn();
      const error = jest.fn();
      const transition = { type: 'drawer', dismissible: false, height: { type: 'percentage', value: 0.8 } };

      Purchasely.presentPresentationWithIdentifier('presentation1', null, transition, success, error);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        error,
        'Purchasely',
        'presentPresentationWithIdentifier',
        ['presentation1', null, transition]
      );
    });
  });

  describe('presentPresentationForPlacement', () => {
    it('should normalize a legacy isFullscreen=false to modal', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.presentPresentationForPlacement('placement1', 'content1', false, success, error);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        error,
        'Purchasely',
        'presentPresentationForPlacement',
        ['placement1', 'content1', { type: 'modal' }]
      );
    });

    it('should default to fullScreen when no displayMode is provided (normalizeTransition default)', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.presentPresentationForPlacement('placement1', 'content1', undefined, success, error);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        error,
        'Purchasely',
        'presentPresentationForPlacement',
        ['placement1', 'content1', { type: 'fullScreen' }]
      );
    });
  });

  describe('presentPresentationForDefault', () => {
    it('should present the default presentation with a transition object', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.presentPresentationForDefault('content1', Purchasely.TransitionType.fullScreen, success, error);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        error,
        'Purchasely',
        'presentPresentationForDefault',
        ['content1', { type: 'fullScreen' }]
      );
    });
  });

  describe('presentation lifecycle callbacks', () => {
    it('routes presented/closeRequested envelopes to callbacks and the final outcome to success', () => {
      const success = jest.fn();
      const onPresented = jest.fn();
      const onCloseRequested = jest.fn();

      Purchasely.presentPresentationForPlacement('p', null, 'fullScreen', success, jest.fn(), { onPresented, onCloseRequested });

      const dispatch = mockExec.mock.calls[0][0];
      dispatch({ event: 'presented', presentation: { screenId: 's' } });
      dispatch({ event: 'closeRequested' });
      dispatch({ result: 1, purchaseResult: 'cancelled', closeReason: 'button' });

      expect(onPresented).toHaveBeenCalledWith({ screenId: 's' }, null);
      expect(onCloseRequested).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith({ result: 1, purchaseResult: 'cancelled', closeReason: 'button' });
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

  describe('fetchPresentation', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.fetchPresentation('presentation1', 'content1', success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'fetchPresentation',
        [null, 'presentation1', 'content1']
      );
    });
  });

  describe('fetchPresentationForPlacement', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.fetchPresentationForPlacement('placement1', 'content1', success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'fetchPresentation',
        ['placement1', null, 'content1']
      );
    });
  });

  describe('fetchPresentationForDefault', () => {
    it('should call exec with both ids null', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.fetchPresentationForDefault('content1', success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'fetchPresentation',
        [null, null, 'content1']
      );
    });
  });

  describe('presentPresentation', () => {
    it('should call exec with a transition object', () => {
      const success = jest.fn();
      const error = jest.fn();
      const presentation = { id: 'test' };

      Purchasely.presentPresentation(presentation, Purchasely.TransitionType.fullScreen, '#FFFFFF', success, error);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        error,
        'Purchasely',
        'presentPresentation',
        [presentation, { type: 'fullScreen' }, '#FFFFFF']
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
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.userSubscriptions(success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        expect.any(Function),
        'Purchasely',
        'userSubscriptions',
        []
      );
    });
  });

  describe('userSubscriptionsHistory', () => {
    it('should call exec with correct parameters', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.userSubscriptionsHistory(success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        expect.any(Function),
        'Purchasely',
        'userSubscriptionsHistory',
        []
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

  describe('closePresentation', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.closePresentation();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'closePresentation',
        []
      );
    });
  });

  describe('backPresentation', () => {
    it('should call exec with correct parameters', () => {
      Purchasely.backPresentation();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'backPresentation',
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
