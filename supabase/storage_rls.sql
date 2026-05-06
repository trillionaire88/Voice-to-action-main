-- Storage RLS for message-attachments bucket (apply after bucket exists).
-- Path layout from client: {conversation_id}/{timestamp}-{filename}
-- Requires: public.conversation_participants(conversation_id, user_id), public.profiles(id, role)

-- Participant policies (authenticated users)
DROP POLICY IF EXISTS "message_attachments_insert_participants" ON storage.objects;
CREATE POLICY "message_attachments_insert_participants"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
      AND cp.conversation_id = split_part(name, '/', 1)::uuid
  )
);

DROP POLICY IF EXISTS "message_attachments_select_participants" ON storage.objects;
CREATE POLICY "message_attachments_select_participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
      AND cp.conversation_id = split_part(name, '/', 1)::uuid
  )
);

-- Platform admins can access all objects in this bucket
DROP POLICY IF EXISTS "message_attachments_select_admin" ON storage.objects;
CREATE POLICY "message_attachments_select_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'owner_admin')
  )
);

DROP POLICY IF EXISTS "message_attachments_insert_admin" ON storage.objects;
CREATE POLICY "message_attachments_insert_admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'owner_admin')
  )
);
