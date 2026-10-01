import { getFooterHtml, getFooterSignatureHtml } from "./footerHelper";

/**
 * WPR/WBR (Weekly Progress Report) notification email — structure copied
 * from coMailtemplate.ts / rfiMailtemplate.ts: same DOCTYPE/html/head, same
 * Outlook MSO conditionals + ExternalClass rules, same 600px table layout
 * and @media mobile rules, same logo + "Project Name: X" header row, same
 * bordered label/value table, same shared footer helpers, same colors
 * (#8cc63f brand green, #333333/#888888 text, #f4f4f4/#f0f0f0 greys) and
 * font (Arial, sans-serif). No CTA button: no other template builds its
 * deep-link via a shared, reusable helper (each just inlines its own
 * `https://ps.whiteboardtec.com/login?redirect=/<entity>/<id>` string), so
 * there is no "existing helper" to reuse and no project URL to invent.
 */

export interface WprTestBanner {
  to: string[];
  cc: string[];
}

export interface WprMailTemplateParams {
  projectName: string;
  /** Already formatted MM/DD/YYYY — formatting stays the caller's job, same as the email subject line. */
  weekEnding: string;
  fabricatorName?: string | null;
  /** PDF attachment filename, shown in the Attachment row. */
  filename: string;
  /**
   * Present ONLY for an INTERNAL-mode test send. Its presence is the sole
   * thing that renders the test banner — LIVE mode must never pass this,
   * not just set it falsy, so the banner is structurally impossible to
   * leak into a real send.
   */
  testBanner?: WprTestBanner;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function buildWprEmailHtml(params: WprMailTemplateParams): string {
  const { projectName, weekEnding, fabricatorName, filename, testBanner } = params;

  const safeProjectName = escapeHtml(projectName || "—");
  const safeFabricatorName = fabricatorName ? escapeHtml(fabricatorName) : null;
  const safeWeekEnding = escapeHtml(weekEnding || "—");
  const safeFilename = escapeHtml(filename || "—");

  const testBannerHtml = testBanner
    ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff4d6; border-left: 3px solid #d9a528; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 14px; color: #6b4e00;">
                    <strong style="display: block; font-size: 15px; margin-bottom: 6px;">TEST EMAIL &mdash; not sent to clients</strong>
                    In LIVE mode this report would have been sent:<br/>
                    <strong>To:</strong> ${escapeHtml(testBanner.to.join(", ") || "(none)")}<br/>
                    <strong>CC:</strong> ${escapeHtml(testBanner.cc.join(", ") || "(none)")}
                  </td>
                </tr>
              </table>`
    : "";

  const customerRow = safeFabricatorName
    ? `
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Customer</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${safeFabricatorName}</td>
                </tr>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Project Station - Weekly Progress Report</title>
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style type="text/css">
    body { margin: 0; padding: 0; min-width: 100% !important; background-color: #f4f4f4; font-family: Arial, sans-serif; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { font-family: Arial, sans-serif; }
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .logo-container, .project-name-container { width: 100% !important; display: block !important; text-align: center !important; }
      .project-name-container { padding: 15px !important; }
      .content-body { padding: 20px !important; }
      .signature-logo, .signature-details { width: 100% !important; display: block !important; border-left: none !important; padding: 10px 0 !important; text-align: center !important; }
      .signature-logo img { margin: 0 auto !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f4f4f4">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <!--[if gte mso 9]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e0e0e0;">
          <!-- Header -->
          <tr>
            <td bgcolor="#ffffff">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="logo-container" width="30%" style="padding: 20px;">
                    <img src="https://res.cloudinary.com/dp7yxzrgw/image/upload/v1753685727/logos/whiteboardtec-logo_oztrhh.png" alt="Whiteboard Logo" width="170" border="0" style="display: block; width: 150px; max-width: 150px;" />
                  </td>
                  <td class="project-name-container" width="70%" style="padding: 10px; color: #888888; font-weight: 600; font-size: 18px; text-align: left;">
                    Project Name: ${safeProjectName.toUpperCase()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td class="content-body" style="padding: 40px 30px; color: #333333; line-height: 1.6;">
              ${testBannerHtml}
              <p style="margin: 0 0 20px 0;">Please find attached the Weekly Progress Report for <strong>${safeProjectName}</strong> for the week ending <strong>${safeWeekEnding}</strong>.</p>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Project</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${safeProjectName}</td>
                </tr>${customerRow}
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Week Ending</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${safeWeekEnding}</td>
                </tr>
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Attachment</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${safeFilename}</td>
                </tr>
              </table>

              ${getFooterSignatureHtml(fabricatorName)}
            </td>
          </tr>
          ${getFooterHtml(fabricatorName)}
        </table>
        <!--[if gte mso 9]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}
