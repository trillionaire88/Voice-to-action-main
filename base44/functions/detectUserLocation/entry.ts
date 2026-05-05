import { createSupabaseContext } from '../lib/supabaseContext.ts';

// Approximate country mapping by IP geolocation (basic)
const COUNTRY_FROM_IP = {
  "US": ["US"],
  "GB": ["GB"],
  "AU": ["AU"],
  "CA": ["CA"],
  "NZ": ["NZ"],
  "DE": ["DE"],
  "FR": ["FR"],
  "JP": ["JP"],
  "IN": ["IN"],
  "BR": ["BR"],
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();

    if (!user) {
      return Response.json({ location: "global" });
    }

    // Check if user has location preference saved
    const userSettings = await adminEntities.UserHeaderSettings?.filter?.({
      user_id: user.id,
    }) || [];

    if (userSettings.length > 0 && userSettings[0].preferred_location) {
      return Response.json({ location: userSettings[0].preferred_location });
    }

    // Default: global
    return Response.json({ location: "global" });
  } catch (error) {
    console.error("Error in detectUserLocation:", error);
    return Response.json({ location: "global" });
  }
});