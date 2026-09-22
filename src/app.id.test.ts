import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";

const APP_ID = "works.dexterity.lockwright";

describe("Lockwright app id", () => {
  it("is works.dexterity.lockwright in app.json", () => {
    const app = JSON.parse(
      readFileSync(path.resolve(__dirname, "../app.json"), "utf8"),
    );
    expect(app.expo.android.package).toBe(APP_ID);
    expect(app.expo.ios.bundleIdentifier).toBe(APP_ID);
    expect(
      app.expo.ios.entitlements["com.apple.security.application-groups"],
    ).toEqual([`group.${APP_ID}`]);
  });

  it("sets Android versionCode past Play's already-used 3", () => {
    const app = JSON.parse(
      readFileSync(path.resolve(__dirname, "../app.json"), "utf8"),
    );
    expect(app.expo.android.versionCode).toBeGreaterThan(3);
    expect(Number.isInteger(app.expo.android.versionCode)).toBe(true);
  });

  it("pins lockwright-lib-constants to Dexterity-Works git, not Tether or file:", () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve(__dirname, "../package.json"), "utf8"),
    );
    expect(pkg.dependencies["lockwright-lib-constants"]).toBe(
      "git+https://github.com/Dexterity-Works/lockwright-lib-constants.git#0221dba94373926c7316c675d9bff774daf8464f",
    );
  });

  it("pins lockwright-lib-ui-react-native-components to Dexterity-Works git, not Tether", () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve(__dirname, "../package.json"), "utf8"),
    );
    expect(pkg.dependencies["lockwright-lib-ui-react-native-components"]).toBe(
      "git+https://github.com/Dexterity-Works/lockwright-lib-ui-react-native-components.git#design-system-v2",
    );
  });

  it("uses package name lockwright-app-mobile, not pearpass-app-mobile", () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve(__dirname, "../package.json"), "utf8"),
    );
    expect(pkg.name).toBe("lockwright-app-mobile");
  });

  it("ships expo display name Lockwright, not PearPass", () => {
    const app = JSON.parse(
      readFileSync(path.resolve(__dirname, "../app.json"), "utf8"),
    );
    expect(app.expo.name).toBe("Lockwright");
    expect(app.expo.name).not.toMatch(/PearPass/);
  });

  it("autofill chips and system pickers say Lockwright, not PearPass", () => {
    const roots = [
      path.resolve(
        __dirname,
        "../plugins/expo-autofill-plugin/android-template",
      ),
      path.resolve(__dirname, "../plugins/expo-autofill-plugin/ios-template"),
    ];
    const leftover = [
      '"PearPass"',
      '"Unlock PearPass"',
      '"Save passkey in PearPass"',
      '"Authenticate to PearPass"',
      '"Authenticate to access PearPass"',
      '"PearPass is already running"',
      "the PearPass app",
      '"Finish setting up PearPass"',
      '"Open the PearPass app"',
      '"PearPass is not configured"',
      '"PearPass User"',
      "other PearPass instances",
    ];
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, name.name);
        if (name.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(java|swift|xml|strings)$/.test(name.name)) continue;
        const text = readFileSync(full, "utf8");
        for (const phrase of leftover) {
          if (text.includes(phrase)) {
            hits.push(`${path.relative(roots[0], full)}: ${phrase}`);
          }
        }
      }
    };
    for (const root of roots) walk(root);
    expect(hits).toEqual([]);
  });

  it("points Lockwright import help at lockwright.dexterity.works, not PearPass docs", () => {
    const src = readFileSync(
      path.resolve(__dirname, "./screens/ImportItems/index.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/docs\.pass\.pears\.com/);
    expect(src).toMatch(/PEARPASS_WEBSITE/);
  });

  it("report-a-problem opens the Lockwright contact form, not Tether Slack or Google Form", () => {
    const src = readFileSync(
      path.resolve(__dirname, "./screens/Settings/Feedback/index.jsx"),
      "utf8",
    );
    expect(src).not.toMatch(/sendSlackFeedback|sendGoogleFormFeedback/);
    expect(src).toMatch(/PEARPASS_WEBSITE/);
    expect(src).toMatch(/\/contact\//);
    expect(src).toMatch(/Linking\.openURL/);
  });

  it("onboarding autofill graphic is Lockwright, not the PearPass rive", () => {
    const src = readFileSync(
      path.resolve(
        __dirname,
        "./screens/Onboarding/screens/AutofillScreen.jsx",
      ),
      "utf8",
    );
    expect(src).not.toMatch(/resourceName=["']autofill["']/);
    expect(src).toMatch(/LogoLock/);
    expect(src).toMatch(/Lockwright/);
    expect(
      existsSync(
        path.resolve(
          __dirname,
          "../plugins/withRiveAssets/templates/android/autofill.riv",
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        path.resolve(
          __dirname,
          "../plugins/withRiveAssets/templates/ios/autofill.riv",
        ),
      ),
    ).toBe(false);
  });

  it("onboarding wash is hatch dusk, not PearPass olive", () => {
    const files = [
      path.resolve(
        __dirname,
        "./screens/Onboarding/components/OnboardingLayout.jsx",
      ),
      path.resolve(
        __dirname,
        "./screens/Onboarding/screens/DataLocalScreen.jsx",
      ),
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/#3A4A1A|#B0D944|#BADE5B/i);
    }
  });

  it("in-app logos use the hatch plate, not PearPass lime", () => {
    const files = [
      path.resolve(__dirname, "./svgs/LogoLock/index.jsx"),
      path.resolve(__dirname, "./svgs/LogoTextWithLock/index.jsx"),
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src).toContain("#b08d57");
      expect(src).not.toMatch(/#B0D944|#BADE5B/i);
    }
  });

  it("Unlock-to-fill uses hatch dusk, not PearPass lime", () => {
    const pearLime =
      /#B0D944|#BADE5B|#3A4A1A|#080A05|#15180E|#37431D|#8AE081|#FDCA40|#98C328|#BAE061|#BDC3AC|#435123/i;
    const androidColors = readFileSync(
      path.resolve(
        __dirname,
        "../plugins/expo-autofill-plugin/android-template/res/values/colors.xml",
      ),
      "utf8",
    );
    const iosColors = readFileSync(
      path.resolve(
        __dirname,
        "../plugins/expo-autofill-plugin/ios-template/PearPassAutofillExtension/Tokens/PPColors.swift",
      ),
      "utf8",
    );
    const missing = readFileSync(
      path.resolve(
        __dirname,
        "../plugins/expo-autofill-plugin/android-template/res/layout/fragment_missing_configuration.xml",
      ),
      "utf8",
    );
    const errorIcon = readFileSync(
      path.resolve(
        __dirname,
        "../plugins/expo-autofill-plugin/android-template/res/drawable/pp_ic_error.xml",
      ),
      "utf8",
    );
    const androidLogo = readFileSync(
      path.resolve(
        __dirname,
        "../plugins/expo-autofill-plugin/android-template/res/drawable/pp_ic_app_logo.xml",
      ),
      "utf8",
    );
    const leftover = [
      path.resolve(
        __dirname,
        "../plugins/expo-autofill-plugin/android-template/res/drawable/primary_button.xml",
      ),
      path.resolve(
        __dirname,
        "../plugins/expo-autofill-plugin/android-template/res/drawable/secondary_button.xml",
      ),
      path.resolve(
        __dirname,
        "../plugins/expo-autofill-plugin/android-template/res/layout/fragment_existing_credential_selection.xml",
      ),
      path.resolve(
        __dirname,
        "../plugins/expo-autofill-plugin/ios-template/PearPassAutofillExtension/PPAssets.xcassets/Icons/ErrorIcon.imageset/error_icon.svg",
      ),
    ].map((file) => readFileSync(file, "utf8"));

    expect(androidColors).toMatch(/pp_primary">#FFB08D57</i);
    expect(androidColors).toMatch(/pp_background">#FF08090B</i);
    expect(androidColors).toMatch(/pp_surface_primary">#FF14161B</i);
    expect(androidColors).not.toMatch(pearLime);
    expect(iosColors).toMatch(/primary = Color\(hex: 0xB08D57\)/);
    expect(iosColors).toMatch(/background = Color\(hex: 0x08090B\)/);
    expect(iosColors).toMatch(/surfacePrimary = Color\(hex: 0x14161B\)/);
    expect(iosColors).not.toMatch(pearLime);
    expect(missing).toMatch(/Finish setting up Lockwright/);
    expect(missing).not.toMatch(/PearPass/);
    expect(errorIcon).not.toMatch(pearLime);
    expect(androidLogo).toMatch(/#b08d57|#FFB08D57/i);
    expect(androidLogo).not.toMatch(/M26\.5335/);
    expect(androidLogo).not.toMatch(pearLime);
    for (const src of leftover) {
      expect(src).not.toMatch(pearLime);
    }
  });

  it("Play listing is Lockwright with a 512 icon", () => {
    const title = readFileSync(
      path.resolve(__dirname, "../metadata/en-US/title.txt"),
      "utf8",
    ).trim();
    expect(title).toBe("Lockwright");
    const icon = readFileSync(
      path.resolve(__dirname, "../metadata/en-US/images/icon.png"),
    );
    expect(icon.readUInt32BE(16)).toBe(512);
    expect(icon.readUInt32BE(20)).toBe(512);
    const listing = readFileSync(
      path.resolve(__dirname, "../metadata/en-US/full_description.txt"),
      "utf8",
    );
    expect(listing).not.toMatch(/PearPass is a fully local/);
  });

  it("Play targets Android 16 and minifies release with R8", () => {
    const app = JSON.parse(
      readFileSync(path.resolve(__dirname, "../app.json"), "utf8"),
    );
    const android = app.expo.plugins.find(
      (plugin: unknown) =>
        Array.isArray(plugin) && plugin[0] === "expo-build-properties",
    )?.[1]?.android;
    expect(android.compileSdkVersion).toBe(36);
    expect(android.targetSdkVersion).toBe(36);
    expect(android.buildToolsVersion).toBe("36.0.0");
    expect(android.enableMinifyInReleaseBuilds).toBe(true);
    const plugin = readFileSync(
      path.resolve(
        __dirname,
        "../plugins/withAppConfig/src/android/withCompileSdk36.ts",
      ),
      "utf8",
    );
    expect(plugin).toMatch(/suppressUnsupportedCompileSdk/);
    expect(plugin).toMatch(/['"]36['"]/);
  });

  it("drawer lists Generator and opens the password generator", () => {
    const folderList = readFileSync(
      path.resolve(__dirname, "./containers/FolderList/index.jsx"),
      "utf8",
    );
    const drawer = readFileSync(
      path.resolve(__dirname, "./containers/DrawerContent/index.jsx"),
      "utf8",
    );
    const generator = readFileSync(
      path.resolve(__dirname, "./screens/CreateRecord/CreatePasswordItem.tsx"),
      "utf8",
    );
    const history = readFileSync(
      path.resolve(__dirname, "./utils/passwordGeneratorHistory.js"),
      "utf8",
    );
    expect(folderList).toMatch(/id: ['"]generator['"]/);
    expect(folderList).toMatch(/t`Generator`/);
    expect(drawer).toMatch(/folder\?\.id === ['"]generator['"]/);
    expect(drawer).toMatch(/navigate\(['"]CreatePasswordItem['"]\)/);
    expect(generator).toMatch(/t`Generator`/);
    expect(history).toMatch(/app\/password-generator-history/);
    expect(generator).toMatch(/DEFAULT_CHARACTER_COUNT/);
    expect(generator).toMatch(/loadLastCharacterCount/);
    expect(generator).toMatch(/saveLastCharacterCount/);
    expect(generator).toMatch(/lowercaseLetters/);
    expect(generator).toMatch(/PASSWORD_SLIDER_MAX = 128/);
    expect(generator).toMatch(/markHistoryUsed/);
  });

  it("tab bar places Generator between Authenticator and Settings", () => {
    const tab = readFileSync(
      path.resolve(__dirname, "./app/TabNavigator/index.tsx"),
      "utf8",
    );
    const authenticator = tab.indexOf('name="Authenticator"');
    const generator = tab.indexOf('name="Generator"');
    const settings = tab.indexOf('name="Settings"');
    expect(authenticator).toBeGreaterThan(-1);
    expect(generator).toBeGreaterThan(authenticator);
    expect(settings).toBeGreaterThan(generator);
    expect(tab).toMatch(/component=\{Generator\}/);
  });

  it("app.config.ts has one default export and no leftover tail", () => {
    const src = readFileSync(
      path.resolve(__dirname, "../app.config.ts"),
      "utf8",
    );
    expect([...src.matchAll(/^export default /gm)]).toHaveLength(1);
    expect(src).not.toMatch(/}\s+plugins\.push/);
  });
});
