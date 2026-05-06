import { createSupabaseContext } from '../lib/supabaseContext.ts';

// Simple deterministic hash using Web Crypto API
async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildChecksum(record) {
  // Build a stable checksum from key public fields only (no private data)
  const fields = [];
  if (record.title) fields.push(record.title);
  if (record.question) fields.push(record.question);
  if (record.name) fields.push(record.name);
  if (record.signature_count_total !== undefined) fields.push(String(record.signature_count_total));
  if (record.total_votes_cached !== undefined) fields.push(String(record.total_votes_cached));
  if (record.raw_approval_score !== undefined) fields.push(String(record.raw_approval_score));
  if (record.status) fields.push(record.status);
  if (record.created_date) fields.push(record.created_date);
  return fields.join('|');
}

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'add', record_type, record_id } = body;

    if (action === 'add') {
      // Fetch the record
      let record = null;
      if (record_type === 'petition') record = await adminEntities.Petition.get(record_id);
      else if (record_type === 'vote_result') record = await adminEntities.Poll.get(record_id);
      else if (record_type === 'scorecard') record = await adminEntities.Scorecard.get(record_id);
      else if (record_type === 'governance_vote') record = await adminEntities.GovernanceVote.get(record_id);

      if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });

      const checksum = buildChecksum(record);
      const timestamp = new Date().toISOString();
      const hashInput = `${record_type}:${record_id}:${checksum}:${timestamp}`;
      const hash = await sha256(hashInput);
      const signature = await sha256(`vta_platform:${hash}:${timestamp}`);

      // Get previous entry for chain
      const prev = await adminEntities.LedgerEntry.list('-created_date', 1);
      const previousHash = prev[0]?.record_hash || '0000000000000000';

      const entry = await adminEntities.LedgerEntry.create({
        record_type,
        record_id,
        record_hash: hash,
        data_checksum: checksum,
        previous_hash: previousHash,
        signature: signature.slice(0, 32),
        source_node: 'local',
        verification_status: 'verified',
        verified_at: timestamp,
        record_title: record.title || record.question || record.name || record_id,
        is_public: true,
      });

      return Response.json({ success: true, entry, hash });
    }

    if (action === 'verify') {
      // Verify a specific ledger entry
      const entries = await adminEntities.LedgerEntry.filter({ record_id });
      if (!entries || entries.length === 0) return Response.json({ verified: false, reason: 'No ledger entry found' });

      const entry = entries[0];

      // Fetch current record and recompute hash
      let record = null;
      if (entry.record_type === 'petition') record = await adminEntities.Petition.get(record_id);
      else if (entry.record_type === 'vote_result') record = await adminEntities.Poll.get(record_id);
      else if (entry.record_type === 'scorecard') record = await adminEntities.Scorecard.get(record_id);

      if (!record) return Response.json({ verified: false, reason: 'Source record deleted' });

      const currentChecksum = buildChecksum(record);
      const isMatch = currentChecksum === entry.data_checksum;

      if (!isMatch) {
        await adminEntities.LedgerEntry.update(entry.id, { verification_status: 'modified' });
      }

      return Response.json({ verified: isMatch, entry, current_checksum: currentChecksum, stored_checksum: entry.data_checksum });
    }

    if (action === 'bulk_add') {
      // Add all active petitions + polls + scorecards to ledger
      const [petitions, polls, scorecards] = await Promise.all([
        adminEntities.Petition.filter({ status: 'active' }, '-created_date', 20),
        adminEntities.Poll.filter({ status: 'open' }, '-created_date', 20),
        adminEntities.Scorecard.filter({ status: 'approved' }, '-created_date', 10),
      ]);

      let added = 0;
      const allItems = [
        ...petitions.map(r => ({ r, t: 'petition' })),
        ...polls.map(r => ({ r, t: 'vote_result' })),
        ...scorecards.map(r => ({ r, t: 'scorecard' })),
      ];

      for (const { r, t } of allItems.slice(0, 20)) {
        const existing = await adminEntities.LedgerEntry.filter({ record_id: r.id });
        if (existing.length > 0) continue;

        const checksum = buildChecksum(r);
        const timestamp = new Date().toISOString();
        const hash = await sha256(`${t}:${r.id}:${checksum}:${timestamp}`);
        const signature = await sha256(`vta_platform:${hash}:${timestamp}`);
        const prev = await adminEntities.LedgerEntry.list('-created_date', 1);
        const previousHash = prev[0]?.record_hash || '0000000000000000';

        await adminEntities.LedgerEntry.create({
          record_type: t,
          record_id: r.id,
          record_hash: hash,
          data_checksum: checksum,
          previous_hash: previousHash,
          signature: signature.slice(0, 32),
          source_node: 'local',
          verification_status: 'verified',
          verified_at: timestamp,
          record_title: r.title || r.question || r.name || r.id,
          is_public: true,
        });
        added++;
      }

      return Response.json({ success: true, added });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});