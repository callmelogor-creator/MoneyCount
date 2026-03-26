module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 試吓掉返轉，等 Reanimated 先行，Worklets 喺後，呢招喺好多 Case 都救到命
      'react-native-reanimated/plugin',
      'react-native-worklets-core/plugin',
    ],
  };
};