module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Must be listed LAST — required by react-native-reanimated v3
      'react-native-reanimated/plugin',
    ],
  };
};
