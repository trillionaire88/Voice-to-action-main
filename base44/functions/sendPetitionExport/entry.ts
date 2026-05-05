import { createSupabaseContext } from '../lib/supabaseContext.ts';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const { petitionId, emailAddresses } = await req.json();

    if (!petitionId) {
      return Response.json({ error: 'Missing petitionId' }, { status: 400 });
    }

    if (!emailAddresses || emailAddresses.length === 0) {
      return Response.json({ error: 'No email addresses provided' }, { status: 400 });
    }

    // Fetch petition data
    const [petitions, signatures, credibility] = await Promise.all([
      entities.Petition.filter({ id: petitionId }),
      entities.PetitionSignature.filter({ petition_id: petitionId }),
      entities.CredibilityScore.filter({ petition_id: petitionId }).catch(() => []),
    ]);

    const petition = petitions[0];
    if (!petition) {
      return Response.json({ error: 'Petition not found' }, { status: 404 });
    }

    const credScore = credibility[0] || {};

    // Privacy: no personal signer data (Privacy Act 1988). Aggregated signatory rows only.
    const csvHeader = [
      'PRIVACY NOTICE,"This export does not include names, emails, or other personal signer data. Rows are anonymised (sequence, country, verification flag, date only)."',
      '',
      'Platform,Voice to Action',
      'Petition Title,' + (petition.title || ''),
      'Description,' + (petition.short_summary || ''),
      'Creator,' + (petition.creator_name || ''),
      'Date,' + (petition.created_date ? format(new Date(petition.created_date), 'PPP') : ''),
      'Total Signatures,' + (petition.signature_count_total || 0),
      'Goal,' + (petition.signature_goal || 0),
      'Verified Score,' + (credScore.overall_score || 'N/A'),
      '',
      'Signatory #,Country Code,Verified User,Date Signed',
    ];

    const csvRows = signatures.map((s, i) =>
      `"${i + 1}","${s.country_code || ''}","${s.is_verified_user ? 'Yes' : 'No'}","${s.created_date ? format(new Date(s.created_date), 'PPP') : ''}"`
    );

    const csvContent = [...csvHeader, ...csvRows].join('\n');

    // Generate plain text email body
    const emailBody = `
PETITION EXPORT - VOICE TO ACTION
==================================

Petition: ${petition.title}

Summary:
${petition.short_summary}

Creator: ${petition.creator_name || 'N/A'}
Created: ${petition.created_date ? format(new Date(petition.created_date), 'PPP') : 'N/A'}

Statistics:
- Total Signatures: ${(petition.signature_count_total || 0).toLocaleString()}
- Verified Signatures: ${(petition.signature_count_verified || 0).toLocaleString()}
- Goal: ${(petition.signature_goal || 0).toLocaleString()}
- Verification Score: ${credScore.overall_score || 'N/A'}/100

Category: ${(petition.category || '').replace(/_/g, ' ')}
Target: ${petition.target_name || 'N/A'}
Country: ${petition.country_code || 'N/A'}

Description:
${petition.full_description || 'No description provided'}

Requested Action:
${petition.requested_action || 'No specific action requested'}

---
This petition export is from Voice to Action.
The attached CSV lists signatories in anonymised form only (no names or emails), consistent with our privacy policy.
    `.trim();

    // Send email to each address
    const emailResults = await Promise.allSettled(
      emailAddresses.map(email =>
        integrations.Core.SendEmail({
          to: email,
          subject: `Petition Export: ${petition.title}`,
          body: emailBody,
          from_name: 'Voice to Action',
        })
      )
    );

    // Check if any emails failed
    const failed = emailResults.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.error('Email failures:', failed.map(r => r.reason));
      return Response.json({ 
        error: `Failed to send to ${failed.length} recipient(s)`,
        details: failed.map(r => r.reason?.message || 'Unknown error')
      }, { status: 500 });
    }

    // Send confirmation to team
    integrations.Core.SendEmail({
      to: 'voicetoaction@outlook.com',
      subject: `[Export] ${petition.title}`,
      body: `Petition export requested.\n\nPetition: "${petition.title}" (ID: ${petitionId})\nSent to: ${emailAddresses.join(', ')}\nTotal signatures: ${petition.signature_count_total || 0}\nDate: ${new Date().toISOString()}`,
      from_name: 'Voice to Action',
    }).catch(err => console.error("Team email failed:", err));

    return Response.json({ 
      success: true, 
      message: `Export sent to ${emailAddresses.length} recipient(s)`,
      sentTo: emailAddresses
    });
  } catch (error) {
    console.error('Export email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});