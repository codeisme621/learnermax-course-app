// Minimal shared email chrome. Inline styles only: email clients ignore stylesheets.

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderActionEmail(input: {
  heading: string;
  paragraphs: string[];
  actionLabel: string;
  actionUrl: string;
  footnote?: string;
}): { html: string; text: string } {
  const paragraphs = input.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#334155">${escapeHtml(p)}</p>`)
    .join('');
  const footnote = input.footnote
    ? `<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#64748b">${escapeHtml(input.footnote)}</p>`
    : '';
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-weight:700;color:#07110f">LearnWithRico</p>
<h1 style="margin:0 0 16px;font-size:22px;color:#07110f">${escapeHtml(input.heading)}</h1>
${paragraphs}
<p style="margin:24px 0"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#6ee7b7;color:#07110f;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px">${escapeHtml(input.actionLabel)}</a></p>
<p style="margin:0;font-size:13px;line-height:20px;color:#64748b">Or paste this link into your browser:<br>${escapeHtml(input.actionUrl)}</p>
${footnote}
</td></tr></table></td></tr></table></body></html>`;
  const text = [input.heading, '', ...input.paragraphs, '', `${input.actionLabel}: ${input.actionUrl}`, ...(input.footnote ? ['', input.footnote] : [])].join('\n');
  return { html, text };
}
