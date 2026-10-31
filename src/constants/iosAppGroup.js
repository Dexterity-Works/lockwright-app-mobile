import { NativeModules } from 'react-native'

import { readNativeConstant } from './appVariant'

// The app group the installed binary was built with, so a dev build uses its
// own group and keychain access group whatever env Metro ran in.
export const IOS_APP_GROUP_ID =
  readNativeConstant(NativeModules.AppGroupHelper, 'appGroupIdentifier') ??
  'group.works.dexterity.lockwright'
