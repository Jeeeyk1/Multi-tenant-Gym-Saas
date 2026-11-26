// Re-applies the native fixes Xcode 27 / iOS 27 need every time `expo prebuild` regenerates ios/.
const {
  withAppDelegate,
  withInfoPlist,
  withPodfile,
  WarningAggregator,
} = require('expo/config-plugins');

const PLUGIN = 'with-ios27-fixes';

const PODFILE_MARKER = '# Xcode 27 rejects deployment targets below iOS 15';
const PODFILE_SNIPPET = `
    ${PODFILE_MARKER}; some pods still declare 12.4/13.4.
    min_ios = podfile_properties['ios.deploymentTarget'] || '15.1'
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new(min_ios)
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios
        end
      end
    end
`;

const SCENE_DELEGATE = `// iOS 27 requires the UIScene lifecycle; the window is created here instead of in AppDelegate.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions)
    window.makeKeyAndVisible()

    if let url = connectionOptions.urlContexts.first?.url {
      RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}

`;

function warn(message) {
  WarningAggregator.addWarningIOS(PLUGIN, message);
}

function patchPodfile(contents) {
  if (contents.includes(PODFILE_MARKER)) return contents;
  const anchor = /(react_native_post_install\([\s\S]*?\n\s*\)\n)/;
  if (!anchor.test(contents)) {
    warn('Could not find react_native_post_install(...) in the Podfile; deployment-target fix not applied.');
    return contents;
  }
  return contents.replace(anchor, `$1${PODFILE_SNIPPET}`);
}

function patchAppDelegate(contents) {
  if (contents.includes('class SceneDelegate')) return contents;

  const windowBlock =
    /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;
  const steps = [
    [
      'var reactNativeFactory: RCTReactNativeFactory?\n',
      'var reactNativeFactory: RCTReactNativeFactory?\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n',
    ],
    ['    bindReactNativeFactory(factory)\n', '    self.launchOptions = launchOptions\n    bindReactNativeFactory(factory)\n'],
    [windowBlock, ''],
    ['class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {', `${SCENE_DELEGATE}class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {`],
  ];

  let result = contents;
  for (const [search, replacement] of steps) {
    const found = typeof search === 'string' ? result.includes(search) : search.test(result);
    if (!found) {
      warn('AppDelegate.swift does not match the expected Expo template; scene-lifecycle fix not applied.');
      return contents;
    }
    result = result.replace(search, replacement);
  }
  return result;
}

const withIos27Fixes = (config) => {
  config = withPodfile(config, (cfg) => {
    cfg.modResults.contents = patchPodfile(cfg.modResults.contents);
    return cfg;
  });

  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      warn('AppDelegate is not Swift; scene-lifecycle fix not applied.');
      return cfg;
    }
    cfg.modResults.contents = patchAppDelegate(cfg.modResults.contents);
    return cfg;
  });

  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

  return config;
};

module.exports = withIos27Fixes;
module.exports.patchPodfile = patchPodfile;
module.exports.patchAppDelegate = patchAppDelegate;
