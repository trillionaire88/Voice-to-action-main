import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";

export async function registerPushNotifications(userId: string) {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return;
  await PushNotifications.register();
  PushNotifications.addListener("registration", async (token) => {
    await supabase.from("push_tokens").upsert(cleanForDB({
      user_id: userId,
      token: token.value,
      platform: "mobile",
    }));
  });
}
