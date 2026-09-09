module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Metro emits classic scripts on web; dependencies can still contain import.meta.
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
