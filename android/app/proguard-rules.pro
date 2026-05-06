# Capacitor / Voice to Action — ProGuard rules

# Keep Capacitor plugin interfaces (JS bridge)
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep @com.getcapacitor.annotation.PluginMethod class * { *; }

# Keep all application classes
-keep class io.voicetoaction.app.** { *; }

# Keep JavaScript interfaces used in WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# AndroidX / Jetpack
-keep class androidx.** { *; }
-dontwarn androidx.**

# Firebase / Google Play Services (push notifications)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Preserve stack trace info for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Parcelable
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
