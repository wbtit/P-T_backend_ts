export const bfaHtmlContent = (bfa: any, projectName: string, submittalSubject: string) => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Project Station - BFA Notification</title>
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
                    Project Name: ${projectName.toUpperCase()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td class="content-body" style="padding: 40px 30px; color: #333333; line-height: 1.6;">
              <p style="margin: 0 0 20px 0;">You have been notified about a <strong>Back from Approval (BFA)</strong> creation. Please find the details below:</p>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td width="200" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Project Name</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${projectName || "N/A"}</td>
                </tr>
                <tr>
                  <td width="200" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Associated Submittal Subject</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${submittalSubject || "N/A"}</td>
                </tr>
                <tr>
                  <td width="200" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Subject</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${bfa.subject || "N/A"}</td>
                </tr>
                <tr>
                  <td width="200" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Description</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${bfa.description || "N/A"}</td>
                </tr>
                <tr>
                  <td width="200" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Status</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333; text-transform: uppercase;"><strong>${bfa.status || "N/A"}</strong></td>
                </tr>
                <tr>
                  <td width="200" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Date of Creation</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${bfa.createdAt ? new Date(bfa.createdAt).toDateString() : new Date().toDateString()}</td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0;">This email is for internal project notifications. Please log in to the project dashboard to review the BFA in detail.</p>
            </td>
          </tr>
          <!-- Footer Signature -->
          <tr>
            <td bgcolor="#fafafa" style="padding: 30px; border-top: 1px solid #e8e8e8;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="signature-logo" width="30%" valign="middle" style="padding-right: 20px;">
                    <img src="https://res.cloudinary.com/dp7yxzrgw/image/upload/v1753685727/logos/whiteboardtec-logo_oztrhh.png" alt="Whiteboard Signature Logo" width="130" border="0" style="display: block; width: 130px; max-width: 130px;" />
                  </td>
                  <td class="signature-details" width="70%" valign="middle" style="border-left: 2px solid #e8e8e8; padding-left: 20px; font-size: 12px; color: #777777; line-height: 1.5; text-align: left;">
                    <strong>WHITEBOARD TECHNOLOGIES</strong><br />
                    10915 N. Sterling Avenue, Suite B-2,<br />
                    Tampa, FL 33612<br />
                    <a href="https://whiteboardtec.com" target="_blank" style="color: #1a73e8; text-decoration: none;">whiteboardtec.com</a>
                  </td>
                </tr>
              </table>
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
</html>
`;
};
