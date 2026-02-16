export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Minimal, provider-agnostic email template.
 * Ported from symmetry-account to keep the same visual baseline.
 */
export function renderBasicEmail(params: {
  title: string;
  previewText?: string;
  paragraphs: string[];
}): RenderedEmail {
  const title = params.title.trim();
  const previewText = (params.previewText ?? '').trim();
  const paragraphs = params.paragraphs.map((p) => p.trim()).filter(Boolean);

  const text = [title, '', ...paragraphs].join('\n');
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7f9;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(previewText || title)}
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 0 24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#111827;">
                <h1 style="margin:0;font-size:20px;line-height:28px;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 24px 24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#111827;font-size:14px;line-height:22px;">
                ${paragraphs.map((p) => `<p style="margin:0 0 12px 0;">${escapeHtml(p)}</p>`).join('')}
              </td>
            </tr>
          </table>
          <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#6b7280;font-size:12px;line-height:18px;padding:12px 0;">
            Symmetry
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: title, text, html };
}

