/**
 * Anti-Scraping & Anti-Cloning Detection System
 * Protects Voice to Action IP from theft and unauthorized copying.
 */
export const AntiScrapingDetector = {
  isHeadlessBrowser() {
    return (
      navigator.webdriver ||
      /HeadlessChrome|PhantomJS|Selenium/i.test(navigator.userAgent)
    );
  },

  /** Generate a cryptographically-random forensic fingerprint for copyright claims. */
  generateForensicFingerprint() {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    const checksum = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
    return {
      timestamp: Date.now(),
      platform: "Voice to Action",
      owner: "Jeremy Kyle Whisson",
      build: "production",
      signature: btoa(`VOICETOACTION-${navigator.userAgent}-${Date.now()}`),
      checksum,
    };
  },
};
