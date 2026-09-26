const reactStrictPreset = require('react-strict-dom/babel-preset');

function getPlatform(caller) {
  return caller && caller.platform;
}

function getIsDev(caller) {
  if (caller?.isDev != null) return caller.isDev;
  return (
    process.env.BABEL_ENV === 'development' ||
    process.env.NODE_ENV === 'development'
  );
}

module.exports = function (api) {
  const platform = api.caller(getPlatform);
  const dev = api.caller(getIsDev);
  // Jest runs on Node, so ESM in node_modules has to become CommonJS there.
  // It must sit before babel-preset-expo (presets run last to first) so it
  // also rewrites the exports React Native's codegen plugin inserts. Metro
  // handles modules itself, so the app bundle does not need it.
  const isTest = api.env('test');

  return {
    presets: [
      ...(isTest
        ? [
            [
              '@babel/preset-env',
              {
                targets: { node: 'current' },
                modules: 'commonjs'
              }
            ]
          ]
        : []),
      'babel-preset-expo',
      [
        reactStrictPreset,
        {
          debug: dev,
          dev,
          platform
        }
      ]
    ],
    plugins: ['macros', 'react-native-worklets-core/plugin']
  }
}
