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
  withGradleProperties,
  AndroidConfig,
} = require('@expo/config-plugins');

const APP_ID_META = 'com.google.android.gms.games.APP_ID';
const APP_ID_STRING = 'game_services_app_id';

// react-native-google-leaderboards-and-achievements 의 build.gradle 은 SDK 버전을
// rootProject.ext 가 아니라 'GoogleLeaderboards_*' gradle 프로퍼티로 읽는다.
// Expo 는 이 값들을 buildscript.ext 에만 두므로, prebuild 시 직접 주입해 준다.
// (값은 android/build.gradle 의 Expo 기본값/ expo-build-properties 설정과 일치)
const LEADERBOARD_GRADLE_PROPS = {
  GoogleLeaderboards_compileSdkVersion: '35',
  GoogleLeaderboards_targetSdkVersion: '35',
  GoogleLeaderboards_minSdkVersion: '24',
  GoogleLeaderboards_kotlinVersion: '2.0.21',
};

function withLeaderboardGradleProps(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(LEADERBOARD_GRADLE_PROPS)) {
      cfg.modResults = cfg.modResults.filter(
        (item) => !(item.type === 'property' && item.key === key),
      );
      cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
}

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
  config = withLeaderboardGradleProps(config);
  return config;
};

module.exports = withPlayGamesServices;
