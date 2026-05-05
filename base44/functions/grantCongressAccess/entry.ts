import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();

    // Admin-only check
    if (user?.role !== 'admin' && user?.role !== 'owner_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, access_type = 'congress_member' } = await req.json();
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const users = await adminEntities.User.filter({ email });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Check if access already exists
    const existingAccess = await adminEntities.CongressAccess.filter({
      user_id: targetUser.id
    });

    if (existingAccess.length > 0) {
      return Response.json({
        success: true,
        message: `Congress access already exists for ${email}`,
        email: email,
        access_type: existingAccess[0].access_type
      });
    }

    // Create congress access record
    await adminEntities.CongressAccess.create({
      user_id: targetUser.id,
      user_email: email,
      access_type: access_type,
      granted_at: new Date().toISOString(),
      granted_by_admin_id: user.id,
      active: true
    });

    console.log(`Congress access granted to ${email} (${access_type})`);

    return Response.json({
      success: true,
      message: `Congress access granted to ${email}`,
      email: email,
      access_type: access_type
    });
  } catch (error) {
    console.error('Error granting congress access:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});