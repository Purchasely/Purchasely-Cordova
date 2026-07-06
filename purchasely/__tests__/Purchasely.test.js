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

      it('should keep paywallObserver as a deprecated alias of observer', () => {
        expect(Purchasely.RunningMode.paywallObserver).toBe('observer');
      });
    });

    describe('PaywallAction', () => {
      it('should have correct paywall action values', () => {
        expect(Purchasely.PaywallAction.close).toBe('close');
        expect(Purchasely.PaywallAction.close_all).toBe('close_all');
        expect(Purchasely.PaywallAction.login).toBe('login');
        expect(Purchasely.PaywallAction.navigate).toBe('navigate');
        expect(Purchasely.PaywallAction.purchase).toBe('purchase');
        expect(Purchasely.PaywallAction.restore).toBe('restore');
        expect(Purchasely.PaywallAction.open_presentation).toBe('open_presentation');
        expect(Purchasely.PaywallAction.open_placement).toBe('open_placement');
        expect(Purchasely.PaywallAction.promo_code).toBe('promo_code');
        expect(Purchasely.PaywallAction.web_checkout).toBe('web_checkout');
      });
    });

    describe('PresentationAction', () => {
      it('should mirror PaywallAction (renamed in 6.0, kept as alias)', () => {
        expect(Purchasely.PresentationAction).toBe(Purchasely.PaywallAction);
        expect(Purchasely.PresentationAction.purchase).toBe('purchase');
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

  describe('readyToOpenDeeplink (deprecated alias)', () => {
    it('should delegate to allowDeeplink', () => {
      Purchasely.readyToOpenDeeplink(true);

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'allowDeeplink',
        [true]
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

  describe('setDefaultPresentationResultHandler (deprecated alias)', () => {
    it('should delegate to setDefaultPresentationDismissHandler', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.setDefaultPresentationResultHandler(success, error);

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
    it('should pass a display mode string', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.presentPresentationWithIdentifier('presentation1', 'content1', Purchasely.TransitionType.drawer, success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'presentPresentationWithIdentifier',
        ['presentation1', 'content1', 'drawer']
      );
    });

    it('should normalize a legacy isFullscreen=true to fullScreen', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.presentPresentationWithIdentifier('presentation1', 'content1', true, success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'presentPresentationWithIdentifier',
        ['presentation1', 'content1', 'fullScreen']
      );
    });
  });

  describe('presentPresentationForPlacement', () => {
    it('should normalize a legacy isFullscreen=false to modal', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.presentPresentationForPlacement('placement1', 'content1', false, success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'presentPresentationForPlacement',
        ['placement1', 'content1', 'modal']
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

  describe('presentPresentation', () => {
    it('should call exec with a display mode string', () => {
      const success = jest.fn();
      const error = jest.fn();
      const presentation = { id: 'test' };

      Purchasely.presentPresentation(presentation, Purchasely.TransitionType.fullScreen, '#FFFFFF', success, error);

      expect(mockExec).toHaveBeenCalledWith(
        success,
        error,
        'Purchasely',
        'presentPresentation',
        [presentation, 'fullScreen', '#FFFFFF']
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

  describe('isDeeplinkHandled (deprecated alias)', () => {
    it('should delegate to handleDeeplink', () => {
      const success = jest.fn();
      const error = jest.fn();

      Purchasely.isDeeplinkHandled('https://example.com/deeplink', success, error);

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

    it('normalizes a legacy boolean handler result (false -> success)', async () => {
      Purchasely.interceptAction('navigate', jest.fn().mockReturnValue(false));
      const nativeSuccess = nativeInterceptorFor('navigate');
      mockExec.mockClear();

      nativeSuccess({ action: 'navigate', callbackId: 'navigate#1' });
      await flush();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'completeActionInterceptor',
        ['navigate#1', 'success']
      );
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

  describe('setPaywallActionInterceptor (deprecated)', () => {
    it('registers an interceptor for every action kind', () => {
      Purchasely.setPaywallActionInterceptor(jest.fn());

      const registered = mockExec.mock.calls
        .filter((c) => c[3] === 'registerActionInterceptor')
        .map((c) => c[4][0]);
      expect(registered).toEqual(
        expect.arrayContaining(Object.values(Purchasely.PaywallAction))
      );
    });

    it('fans intercepts into the single callback, resolved by onProcessAction', async () => {
      const success = jest.fn();
      Purchasely.setPaywallActionInterceptor(success);
      const nativeSuccess = nativeInterceptorFor('purchase');
      mockExec.mockClear();

      nativeSuccess({
        action: 'purchase',
        callbackId: 'purchase#7',
        info: { contentId: 'c' },
        parameters: {},
      });
      await flush();

      expect(success).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'purchase' })
      );

      Purchasely.onProcessAction(Purchasely.InterceptResult.success);
      await flush();

      expect(mockExec).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'Purchasely',
        'completeActionInterceptor',
        ['purchase#7', 'success']
      );
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
});
