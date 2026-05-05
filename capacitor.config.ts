import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.voicetoaction.app",
  appName: "Voice to Action",
  webDir: "dist",
  server: {
    androidScheme: "https",
    iosScheme: "https",
    hostname: "voicetoaction.io",
    // Allow the app to navigate to auth redirect URLs
    allowNavigation: ["voicetoaction.io", "*.supabase.co", "supabase.co"],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#2563eb",
      showSpinner: false,
      androidSplashResourceName: "splash",
      iosSplashResourceName: "Splash",
      launchAutoHide: true,
    },
    StatusBar: {
      style: "DEFAULT",
      backgroundColor: "#ffffff",
    },
  },
};

export default config;
