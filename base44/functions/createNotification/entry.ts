import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, title, message, link, type, data } = await req.json();

    if (!userId || !title || !message || !type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validTypes = ['milestone', 'poll_update', 'new_petition_category', 'system', 'message'];
    if (!validTypes.includes(type)) {
      return Response.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    const notification = await entities.Notification.create({
      user_id: userId,
      type,
      title,
      body: message,
      action_url: link || null,
      is_read: false,
      data: data || null
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    console.error('createNotification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});