export const rfqhtmlContent = (newrfq: any) => {
  // Build greeting from all recipients
  const allRecipients: { firstName?: string; lastName?: string; username?: string }[] = [
    ...(newrfq.multipleRecipients || []),
    ...(newrfq.recipient ? [newrfq.recipient] : []),
  ];
  // Deduplicate by a simple name string
  const recipientNames = Array.from(
    new Set(allRecipients.map(r => [r.firstName, r.lastName].filter(Boolean).join(" ") || r.username || "Recipient"))
  );
  const greeting = recipientNames.length > 1
    ? recipientNames.join(", ")
    : recipientNames[0] || "Recipient";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Project Station - RFQ Notification</title>
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
                    Project Name: ${newrfq.project?.name?.toUpperCase() || "PROJECT NAME"}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td class="content-body" style="padding: 40px 30px; color: #333333; line-height: 1.6;">
              <p style="color: #888888; margin: 0 0 20px 0;">Date: ${new Date().toDateString()}</p>
              <div style="font-size: 18px; font-weight: bold; margin: 0 0 20px 0;">Subject: ${newrfq.subject || "RFQ Notification"}</div>
              <p style="margin: 0 0 20px 0;">You have been notified about a new <strong>Request for Quotation (RFQ)</strong>. Please find the details below:</p>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Reference</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${newrfq.serialNo || "N/A"}</td>
                </tr>
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Project</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${newrfq.project?.name || "N/A"}</td>
                </tr>
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Subject</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${newrfq.subject || "N/A"}</td>
                </tr>
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Status</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${newrfq.status || "N/A"}</td>
                </tr>
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Sender</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${[newrfq.sender?.firstName, newrfq.sender?.lastName].filter(Boolean).join(" ") || newrfq.sender?.username || "N/A"}</td>
                </tr>
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Date</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${newrfq.createdAt ? new Date(newrfq.createdAt).toDateString() : new Date().toDateString()}</td>
                </tr>
              </table>

              ${recipientNames.length > 1 ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9; border-left: 3px solid #8cc63f; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 10px 15px; font-size: 14px;">
                    <strong>All Recipients:</strong><br/>
                    ${recipientNames.join(" &nbsp;|&nbsp; ")}
                  </td>
                </tr>
              </table>` : ""}

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://ps.whiteboardtec.com" style="height:50px;v-text-anchor:middle;width:240px;" arcsize="10%" stroke="f" fillcolor="#8cc63f">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Login to View RFQ</center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="https://ps.whiteboardtec.com" style="background-color: #8cc63f; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; line-height: 50px; text-align: center; text-decoration: none; width: 240px; -webkit-text-size-adjust: none; border-radius: 5px; mso-hide: all;">Login to View RFQ</a>
                  </td>
                </tr>
              </table>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td class="signature-details" valign="top" style="border-left: 1px solid #e0e0e0; padding-left: 20px; color: #777777; font-size: 14px;">
                    <strong style="color: #333333; font-size: 16px;">Project Station</strong><br />
                    Whiteboard Technologies LLC | <a href="https://whiteboardtec.com" style="color: #8cc63f; text-decoration: none;">whiteboardtec.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td bgcolor="#f4f4f4" style="padding: 20px; text-align: center; font-size: 12px; color: #999999;">
              © ${new Date().getFullYear()} Whiteboard Engineering. All Rights Reserved.
            </td>
          </tr>
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
};
