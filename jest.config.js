export default {
  preset: 'react-native',
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^lockwright-lib-ui-theme-provider/native$':
      '<rootDir>/node_modules/lockwright-lib-ui-theme-provider/native/index.js',
    '^lockwright-lib-ui-theme-provider$':
      '<rootDir>/node_modules/lockwright-lib-ui-theme-provider/native/index.js'
  },
  testPathIgnorePatterns: ['/node_modules/', '/.yalc/', '/packages/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|react-redux|@reduxjs/toolkit|immer|styled-components|@testing-library/react-native|expo|expo-local-authentication|@tetherto|lockwright-[a-z-]+|@react-navigation/bottom-tabs|@gorhom/bottom-sheet|expo-clipboard|expo-constants|expo-crypto|expo-haptics|expo-document-picker|expo-file-system|expo-modules-core|expo-sharing|wdk-react-native-passkey-internal|react-native-passkey|axios|react-native-toast-message|react-native-reanimated|react-native-vision-camera|react-native-worklets-core|vision-camera-zxing)/)'
  ],
  setupFilesAfterEnv: ['./jest.setup.js']
}
