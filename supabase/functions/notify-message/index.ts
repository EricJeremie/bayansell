// Sends an email to the recipient of a new GoNegosyo message.
// Invoked by a Postgres trigger (pg_net) after a row is inserted into
// public.messages. Looks up the conversation, figures out who should be
// notified (the participant who did NOT send the message), and emails them
// via Resend. If RESEND_API_KEY isn't configured yet, it logs and no-ops so
// the pipeline stays healthy until you add the key.
//
// Deployed to project qgfbpaetjwvrjnyedokl as the `notify-message` function
// with verify_jwt = false (it's called internally by the DB trigger).
//
// Required/optional secrets (set with: supabase secrets set KEY=value):
//   RESEND_API_KEY  (required to actually send) — https://resend.com
//   NOTIFY_FROM     (optional) e.g. "GoNegosyo <alerts@yourdomain.com>"
//   APP_URL         (optional) defaults to https://gonegosyo.vercel.app

import { createClient } from 'jsr:@supabase/supabase-js@2';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s: string) {
  return String(s || '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}));
    // Accept either { message_id } (our trigger) or a Supabase webhook { record }.
    const messageId = payload.message_id || payload.record?.id;
    if (!messageId) return json({ error: 'missing message_id' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: msg, error: msgErr } = await admin
      .from('messages')
      .select('id, content, sender_id, inquiry_id, inquiries(buyer_id, seller_id, listing_id, listings(title))')
      .eq('id', messageId)
      .single();
    if (msgErr || !msg) return json({ error: 'message not found', detail: msgErr?.message }, 404);

    const inq: any = msg.inquiries;
    if (!inq) return json({ error: 'inquiry not found' }, 404);

    // Notify whoever did not send this message.
    const recipientId = msg.sender_id === inq.seller_id ? inq.buyer_id : inq.seller_id;

    const { data: senderProfile } = await admin
      .from('profiles').select('full_name').eq('id', msg.sender_id).single();
    const senderName = senderProfile?.full_name || 'A GoNegosyo user';

    const { data: recipientUser } = await admin.auth.admin.getUserById(recipientId);
    const recipientEmail = recipientUser?.user?.email;
    if (!recipientEmail) return json({ skipped: 'recipient has no email' });

    const listingTitle = inq?.listings?.title || 'your item';
    const preview = (msg.content || '').slice(0, 500);

    const RESEND = Deno.env.get('RESEND_API_KEY');
    if (!RESEND) {
      console.log(`[notify-message] RESEND_API_KEY not set — would email ${recipientEmail}: ${senderName} re "${listingTitle}"`);
      return json({ skipped: 'RESEND_API_KEY not set', recipientEmail, senderName, listingTitle });
    }

    const from = Deno.env.get('NOTIFY_FROM') || 'GoNegosyo <onboarding@resend.dev>';
    const appUrl = Deno.env.get('APP_URL') || 'https://gonegosyo.vercel.app';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [recipientEmail],
        subject: `New message about ${listingTitle}`,
        html:
          `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px">` +
          `<h2 style="color:#1c3673">You have a new message on GoNegosyo</h2>` +
          `<p><strong>${escapeHtml(senderName)}</strong> messaged you about <strong>${escapeHtml(listingTitle)}</strong>:</p>` +
          `<blockquote style="border-left:3px solid #1c3673;margin:0;padding:8px 14px;color:#444">${escapeHtml(preview)}</blockquote>` +
          `<p><a href="${appUrl}/#/dashboard" style="display:inline-block;margin-top:12px;background:#1c3673;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open your dashboard to reply</a></p>` +
          `</div>`,
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) console.error('[notify-message] resend error', out);
    return json({ sent: res.ok, recipientEmail, resend: out }, res.ok ? 200 : 502);
  } catch (e) {
    console.error('[notify-message] error', e);
    return json({ error: String(e) }, 500);
  }
});
