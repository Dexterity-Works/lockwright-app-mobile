import type { ExpoConfig } from "@expo/config";
import { readFileSync } from "fs";
import path from "path";

import resolveConfig from "../app.config";

const readApp = () =>
  JSON.parse(readFileSync(path.resolve(__dirname, "../app.json"), "utf8"));

const resolve = (variant: string | undefined, app = readApp().expo) => {
  const saved = process.env.APP_VARIANT;
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;
  try {
    return resolveConfig({ config: app } as never);
  } finally {
    if (saved === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = saved;
  }
};

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
  it("keeps the store IDs when APP_VARIANT is unset", () => {
    const app = readApp().expo;
    const config = resolve(undefined);

    expect(config.name).toBe(app.name);
    expect(config.icon).toBe(app.icon);
    expect(config.android).toEqual(app.android);
    expect(config.ios).toEqual(app.ios);
    expect(config.extra?.eas).toEqual(app.extra.eas);
    expect(config.extra).not.toHaveProperty("appVariant");
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
    expect(config.extra?.appVariant).toBe("dev");
    expect(JSON.stringify(config)).not.toMatch(
      /works\.dexterity\.lockwright(?!\.dev)/,
    );
    expect(input).toEqual(app);
  });

  it("refuses any other APP_VARIANT", () => {
    expect(() => resolve("staging")).toThrow(/APP_VARIANT/);
  });
});
