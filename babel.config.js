module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 只留呢一個，睇吓佢仲撞唔撞！
      'react-native-reanimated/plugin',
    ],
  };
};