import type { ExpoConfig } from "@expo/config";

import resolveConfig from "../app.config";

const ROOT = "/app";
let mockNativeFiles: Record<string, string> = {};

jest.mock("node:fs", () => ({
  existsSync: (file: string) =>
    Object.keys(mockNativeFiles).some(
      (known) => known === file || known.startsWith(`${file}/`),
    ),
  readFileSync: (file: string) => mockNativeFiles[file],
  readdirSync: (dir: string) => [
    ...new Set(
      Object.keys(mockNativeFiles)
        .filter((known) => known.startsWith(`${dir}/`))
        .map((known) => known.slice(dir.length + 1).split("/")[0]),
    ),
  ],
}));

const readApp = () => JSON.parse(JSON.stringify(require("../app.json")));

const resolve = (
  variant: string | undefined,
  app = readApp().expo,
  command?: string,
) => {
  // Expo CLI sees `node <expo cli> <command...>`.
  const saved = process.env.APP_VARIANT;
  const savedArgv = process.argv;
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;
  if (command) process.argv = ["node", "expo", ...command.split(" ")];
  try {
    return resolveConfig({ config: app, projectRoot: ROOT } as never);
  } finally {
    if (saved === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = saved;
    process.argv = savedArgv;
  }
};

const gradle = (applicationId: string) =>
  `android {\n    namespace '${applicationId}'\n    defaultConfig {\n        applicationId '${applicationId}'\n    }\n}\n`;

const pbxproj = (bundleId: string) =>
  [bundleId, bundleId, `${bundleId}.PearPassAutoFillExtension`]
    .map((id) => `\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ${id};\n`)
    .join("");

const autofillOptions = (config: { plugins?: unknown[] }) =>
  (
    config.plugins?.find(
      (plugin) =>
        Array.isArray(plugin) && plugin[0] === "./plugins/expo-autofill-plugin",
    ) as [string, { ios: { appGroupIdentifier: string } }]
  )[1];

const appExtension = (config: ExpoConfig) =>
  config.extra?.eas.build.experimental.ios.appExtensions[0];

describe("app variant", () => {
  beforeEach(() => {
    mockNativeFiles = {};
  });

  it("keeps the store IDs when APP_VARIANT is unset", () => {
    const app = readApp().expo;
    const config = resolve(undefined);

    expect(config.name).toBe(app.name);
    expect(config.icon).toBe(app.icon);
    expect(config.android).toEqual(app.android);
    expect(config.ios).toEqual(app.ios);
    expect(config.extra?.eas).toEqual(app.extra.eas);
    expect(autofillOptions(config).ios.appGroupIdentifier).toBe(
      "group.works.dexterity.lockwright",
    );
  });

  it("gives APP_VARIANT=dev its own IDs, group, scheme, name and icon", () => {
    const app = readApp().expo;
    const input = readApp().expo;
    const config = resolve("dev", input);
    const id = "works.dexterity.lockwright.dev";
    const group = `group.${id}`;

    expect(config.name).toBe("Lockwright Dev");
    expect(config.icon).toBe("./assets/images/appIcons/app-icon-dev.png");
    expect(config.android?.package).toBe(id);
    expect(config.android?.adaptiveIcon?.foregroundImage).toBe(
      "./assets/images/appIcons/adaptive-icon-dev.png",
    );
    expect(config.ios?.bundleIdentifier).toBe(id);
    expect(config.ios?.scheme).toBe("lockwrightdev");
    expect(
      config.ios?.entitlements?.["com.apple.security.application-groups"],
    ).toEqual([group]);
    expect(autofillOptions(config).ios.appGroupIdentifier).toBe(group);
    expect(appExtension(config)).toEqual({
      targetName: "PearPassAutoFillExtension",
      bundleIdentifier: `${id}.PearPassAutoFillExtension`,
      entitlements: {
        "com.apple.developer.authentication-services.autofill-credential-provider": true,
        "com.apple.security.application-groups": [group],
        "keychain-access-groups": [`$(AppIdentifierPrefix)${id}`],
      },
    });
    expect(JSON.stringify(config)).not.toMatch(
      /works\.dexterity\.lockwright(?!\.dev)/,
    );
    expect(input).toEqual(app);
  });

  it("refuses any other APP_VARIANT", () => {
    expect(() => resolve("staging")).toThrow(/APP_VARIANT/);
  });

  describe("expo run with a prebuilt native project", () => {
    it("refuses a dev run on a store android/", () => {
      mockNativeFiles = { [`${ROOT}/android/app/build.gradle`]: gradle("works.dexterity.lockwright") };

      expect(() => resolve("dev", undefined, "run:android")).toThrow(
        /android\/ was prebuilt for works\.dexterity\.lockwright,.*works\.dexterity\.lockwright\.dev.*APP_VARIANT=dev npx expo prebuild --platform android --clean/,
      );
    });

    it("refuses a store run on a dev ios/", () => {
      mockNativeFiles = {
        [`${ROOT}/ios/LockwrightDev.xcodeproj/project.pbxproj`]: pbxproj(
          "works.dexterity.lockwright.dev",
        ),
      };

      expect(() => resolve(undefined, undefined, "run:ios")).toThrow(
        /ios\/ was prebuilt for works\.dexterity\.lockwright\.dev,.*`npx expo prebuild --platform ios --clean`/,
      );
    });

    it("accepts a native project prebuilt for the same variant", () => {
      mockNativeFiles = {
        [`${ROOT}/android/app/build.gradle`]: gradle("works.dexterity.lockwright.dev"),
        [`${ROOT}/ios/LockwrightDev.xcodeproj/project.pbxproj`]: pbxproj(
          "works.dexterity.lockwright.dev",
        ),
      };

      expect(() => resolve("dev", undefined, "run:android")).not.toThrow();
      expect(() => resolve("dev", undefined, "run:ios")).not.toThrow();
    });

    it("leaves prebuild, start and Xcode or Gradle config reads alone", () => {
      mockNativeFiles = { [`${ROOT}/android/app/build.gradle`]: gradle("works.dexterity.lockwright") };

      expect(() => resolve("dev", undefined, "prebuild")).not.toThrow();
      expect(() => resolve("dev", undefined, "prebuild --platform android --clean")).not.toThrow();
      expect(() => resolve("dev", undefined, "start --dev-client")).not.toThrow();
      expect(() => resolve("dev")).not.toThrow();
    });

    describe("expo run <platform> and bare expo run", () => {
      const storeAndroid = { [`${ROOT}/android/app/build.gradle`]: gradle("works.dexterity.lockwright") };
      const devAndroid = { [`${ROOT}/android/app/build.gradle`]: gradle("works.dexterity.lockwright.dev") };
      const storeIos = {
        [`${ROOT}/ios/Lockwright.xcodeproj/project.pbxproj`]: pbxproj("works.dexterity.lockwright"),
      };
      const devIos = {
        [`${ROOT}/ios/LockwrightDev.xcodeproj/project.pbxproj`]: pbxproj("works.dexterity.lockwright.dev"),
      };

      it("checks android/ for run android, both ways", () => {
        mockNativeFiles = storeAndroid;
        expect(() => resolve("dev", undefined, "run android")).toThrow(/android\/ was prebuilt for works\.dexterity\.lockwright,/);
        mockNativeFiles = devAndroid;
        expect(() => resolve(undefined, undefined, "run android --variant debug")).toThrow(/android\/ was prebuilt for works\.dexterity\.lockwright\.dev,/);
      });

      it("checks ios/ for run ios, both ways", () => {
        mockNativeFiles = storeIos;
        expect(() => resolve("dev", undefined, "run ios")).toThrow(/ios\/ was prebuilt for works\.dexterity\.lockwright,/);
        mockNativeFiles = devIos;
        expect(() => resolve(undefined, undefined, "run ios --device")).toThrow(/ios\/ was prebuilt for works\.dexterity\.lockwright\.dev,/);
      });

      it("checks only the named platform", () => {
        mockNativeFiles = { ...devIos, ...storeAndroid };
        expect(() => resolve("dev", undefined, "run ios")).not.toThrow();
        expect(() => resolve("dev", undefined, "run:ios")).not.toThrow();
      });

      it("checks both folders when expo run will prompt for the platform", () => {
        mockNativeFiles = { ...devAndroid, ...storeIos };
        expect(() => resolve("dev", undefined, "run")).toThrow(/ios\/ was prebuilt for works\.dexterity\.lockwright,/);
        // A flag before the platform makes Expo prompt too.
        expect(() => resolve("dev", undefined, "run --device ios")).toThrow(/ios\/ was prebuilt/);
        mockNativeFiles = { ...devAndroid, ...storeIos };
        expect(() => resolve(undefined, undefined, "run")).toThrow(/android\/ was prebuilt for works\.dexterity\.lockwright\.dev,/);
      });

      it("finds the command after Expo's global flags", () => {
        mockNativeFiles = storeAndroid;
        expect(() => resolve("dev", undefined, "--non-interactive run android")).toThrow(/android\/ was prebuilt/);
      });
    });
  });
});
