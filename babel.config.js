module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          web: {
            // Hermes (web) doesn’t support import.meta; transform it for deps like Zustand ESM
            unstable_transformImportMeta: true,
          },
        },
      ],
    ],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};
