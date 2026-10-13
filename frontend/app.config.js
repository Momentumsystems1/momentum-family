// Dynamic native configuration for BAYMOVE / G3000.
// Read build-time variables only. Do not paste Google Maps API key values into Git.
const base = require("./app.json").expo;

module.exports = () => {
  const androidKey = (process.env.G3000_MAPS_ANDROID_API_KEY || "").trim();
  const iosKey = (process.env.G3000_MAPS_IOS_API_KEY || "").trim();
  const mapsPlugin = {};
  if (androidKey) mapsPlugin.androidGoogleMapsApiKey = androidKey;
  if (iosKey) mapsPlugin.iosGoogleMapsApiKey = iosKey;

  return {
    ...base,
    plugins: [
      ...(base.plugins || []),
      Object.keys(mapsPlugin).length ? ["react-native-maps", mapsPlugin] : "react-native-maps",
    ],
    extra: {
      ...(base.extra || {}),
      // Non-sensitive booleans: never place the actual key in extra or EXPO_PUBLIC_*.
      g3000GoogleMapsAndroidConfigured: Boolean(androidKey),
      g3000GoogleMapsIOSConfigured: Boolean(iosKey),
    },
  };
};
