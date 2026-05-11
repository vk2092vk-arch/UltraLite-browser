/**
 * Expo Config Plugin: Remove RECORD_AUDIO permission from AndroidManifest.
 *
 * Reason: `expo-av` automatically declares android.permission.RECORD_AUDIO
 * because it COULD be used for recording. UltraLite only PLAYS audio
 * (radio streaming), never records it. Google Play flags RECORD_AUDIO as
 * a permission that requires a privacy policy and blocks the AAB upload
 * unless we explicitly strip it.
 *
 * We use the Android manifest merger's `tools:node="remove"` directive,
 * which is the recommended way to drop a permission introduced by a
 * dependency without forking the library.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const RECORD_AUDIO = 'android.permission.RECORD_AUDIO';

const withRemoveRecordAudio = (config) => {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Ensure xmlns:tools is declared so tools:node is valid.
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const permissions = Array.isArray(manifest['uses-permission'])
      ? manifest['uses-permission']
      : [];

    // Drop any existing RECORD_AUDIO entries that other libs added.
    const filtered = permissions.filter(
      (perm) => perm && perm.$ && perm.$['android:name'] !== RECORD_AUDIO
    );

    // Re-declare RECORD_AUDIO with tools:node="remove" so manifest merger
    // strips it from the final merged manifest used to build the AAB/APK.
    filtered.push({
      $: {
        'android:name': RECORD_AUDIO,
        'tools:node': 'remove',
      },
    });

    manifest['uses-permission'] = filtered;
    return cfg;
  });
};

module.exports = withRemoveRecordAudio;
