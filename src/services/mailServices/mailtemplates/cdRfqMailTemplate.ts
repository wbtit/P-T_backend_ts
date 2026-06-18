import { getFooterHtml, getFooterSignatureHtml } from "./footerHelper";

export const cdRfqHtmlContent = (newrfq: any, fabricatorName?: string) => {
  const projectName = newrfq.project?.name || newrfq.projectName || "N/A";
  const headerProjectName = projectName === "N/A" ? "PROJECT NAME" : projectName.toUpperCase();
  const rawDueDate = newrfq.estimationDate ?? newrfq.EstimationDate ?? newrfq.dueDate;
  const dueDate =
    rawDueDate && !Number.isNaN(new Date(rawDueDate).getTime())
      ? new Date(rawDueDate).toDateString()
      : "N/A";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Project Station - RFQ Connection Designer Assignment</title>
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
          <!-- Action Required Banner -->
          <tr>
            <td bgcolor="#d9534f" style="padding: 10px; text-align: center; color: #ffffff; font-weight: bold; font-size: 16px;">
              ACTION REQUIRED
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td bgcolor="#ffffff">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="logo-container" width="30%" style="padding: 20px;">
                    <img src="https://res.cloudinary.com/dp7yxzrgw/image/upload/v1753685727/logos/whiteboardtec-logo_oztrhh.png" alt="Whiteboard Logo" width="170" border="0" style="display: block; width: 150px; max-width: 150px;" />
                  </td>
                  <td class="project-name-container" width="70%" style="padding: 10px; color: #888888; font-weight: 600; font-size: 18px; text-align: left;">
                    Project Name: ${headerProjectName}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td class="content-body" style="padding: 40px 30px; color: #333333; line-height: 1.6;">
              <div style="font-size: 18px; font-weight: bold; margin: 0 0 20px 0;">RFQ Connection Designer Assignment</div>
              <p style="margin: 0 0 20px 0;">You have been assigned as a Connection Designer for a <strong>Request for Quotation (RFQ)</strong>. Please find the details below:</p>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Sender</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${[newrfq.sender?.firstName, newrfq.sender?.lastName].filter(Boolean).join(" ") || newrfq.sender?.username || "N/A"}</td>
                </tr>
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Due Date</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${dueDate}</td>
                </tr>
                <tr>
                  <td width="140" valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #888888; font-weight: bold; font-size: 14px;">Date</td>
                  <td valign="top" style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">${newrfq.createdAt ? new Date(newrfq.createdAt).toDateString() : new Date().toDateString()}</td>
                </tr>
              </table>

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
};
