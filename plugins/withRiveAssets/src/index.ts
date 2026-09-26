import { ConfigPlugin, withDangerousMod, withXcodeProject, IOSConfig } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

// Only the animations the onboarding screens reference by resourceName.
const RIVE_ASSETS = ['face_id.riv', 'fingerprint.riv', 'sync_without_the_cloud.riv'];

const withRiveAssets: ConfigPlugin = (config) => {
  // iOS: Copy .riv files to project directory and add to Xcode project
  config = withXcodeProject(config, async (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName || 'Lockwright';
    const iosDir = cfg.modRequest.platformProjectRoot;
    const templateDir = path.join(__dirname, '../templates/ios');
    const projectDir = path.join(iosDir, projectName);

    // Copy .riv files to the project directory
    for (const file of RIVE_ASSETS) {
      const srcPath = path.join(templateDir, file);
      const destPath = path.join(projectDir, file);
      await fs.promises.copyFile(srcPath, destPath);

      // Add file to Xcode project using IOSConfig.XcodeUtils.addResourceFileToGroup
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: destPath,
        groupName: projectName,
        isBuildFile: true,
        project,
        verbose: false,
      });
    }

    return cfg;
  });

  // Android: Copy .riv files to res/raw/
  config = withDangerousMod(config, ['android', async (cfg) => {
    const templateDir = path.join(__dirname, '../templates/android');
    const androidDir = cfg.modRequest.platformProjectRoot;
    const rawDir = path.join(androidDir, 'app/src/main/res/raw');

    // Ensure raw directory exists
    await fs.promises.mkdir(rawDir, { recursive: true });

    for (const file of RIVE_ASSETS) {
      const srcPath = path.join(templateDir, file);
      const destPath = path.join(rawDir, file);
      await fs.promises.copyFile(srcPath, destPath);
    }

    return cfg;
  }]);

  return config;
};

export default withRiveAssets;
