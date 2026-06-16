/**
 * Expo config plugin — Google Play Games Services 안드로이드 설정 주입.
 *
 * Play Games는 AndroidManifest에 게임 앱 ID 메타데이터와 string 리소스를
 * 요구한다. 커뮤니티 라이브러리에 config plugin이 없으므로 prebuild 시
 * 다음을 주입한다:
 *   - res/values/strings.xml: <string name="game_services_app_id">APPID</string>
 *   - AndroidManifest: <meta-data com.google.android.gms.games.APP_ID
 *                                 = @string/game_services_app_id />
 *
 * app.json plugins에 ["./plugins/withPlayGamesServices", { "appId": "<프로젝트 ID>" }]
 * 로 등록한다. appId는 Play Console → Play Games Services 프로젝트의 숫자 ID.
 * 자세한 절차는 docs/06-game-services.md.
 */
const {
  withAndroidManifest,
  withStringsXml,
  AndroidConfig,
} = require('@expo/config-plugins');

const APP_ID_META = 'com.google.android.gms.games.APP_ID';
const APP_ID_STRING = 'game_services_app_id';

function withGamesAppIdString(config, appId) {
  return withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          _: appId,
          $: { name: APP_ID_STRING, translatable: 'false' },
        },
      ],
      cfg.modResults,
    );
    return cfg;
  });
}

function withGamesAppIdMeta(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      app,
      APP_ID_META,
      `@string/${APP_ID_STRING}`,
    );
    return cfg;
  });
}

/** @type {import('@expo/config-plugins').ConfigPlugin<{ appId?: string }>} */
const withPlayGamesServices = (config, props = {}) => {
  const appId = props.appId || '0';
  config = withGamesAppIdString(config, appId);
  config = withGamesAppIdMeta(config);
  return config;
};

module.exports = withPlayGamesServices;
