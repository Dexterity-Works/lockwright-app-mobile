import { ConfigPlugin, withMainActivity as withMainActivityMod } from '@expo/config-plugins';

export const withMainActivity: ConfigPlugin = (config) => {
  return withMainActivityMod(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Vault screens must not reach screenshots, recordings or the recents thumbnail
    if (!contents.includes('FLAG_SECURE')) {
      contents = contents.replace(
        /super\.onCreate\(null\)/,
        `super.onCreate(null)
    window.setFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE, android.view.WindowManager.LayoutParams.FLAG_SECURE)`
      );
    }

    // Add CustomSplashScreenView.show(this) after super.onCreate(null) if not present
    if (!contents.includes('CustomSplashScreenView.show(this)')) {
      contents = contents.replace(
        /super\.onCreate\(null\)/,
        `super.onCreate(null)
    CustomSplashScreenView.show(this)`
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
