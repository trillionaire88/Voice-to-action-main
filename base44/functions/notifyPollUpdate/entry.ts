import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const { pollId } = await req.json();

    if (!pollId) {
      return Response.json({ error: 'Missing pollId' }, { status: 400 });
    }

    const poll = await entities.Poll.filter({ id: pollId });
    if (!poll.length) {
      return Response.json({ error: 'Poll not found' }, { status: 404 });
    }

    const votes = await entities.Vote.filter({ poll_id: pollId }, null, 1000);
    const voterIds = [...new Set(votes.map(v => v.user_id).filter(Boolean))];

    let notificationCount = 0;
    for (const voterId of voterIds) {
      await vta.asServiceRole.functions.invoke('createNotification', {
        userId: voterId,
        title: `Poll closed: ${poll[0].question}`,
        message: 'A poll you voted on has closed. Check out the results!',
        link: `/PollDetail?id=${pollId}`,
        type: 'poll_update',
        data: { pollId }
      });
      notificationCount++;
    }

    return Response.json({ success: true, notificationsCreated: notificationCount });
  } catch (error) {
    console.error('notifyPollUpdate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});