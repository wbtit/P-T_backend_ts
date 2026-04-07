// Templates/ifcCompletionInvoiceTemplate.ts

export function ifcCompletionInvoiceTemplate(project: any, fabricator: any) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Whiteboard Engineering - IFC Completion</title>
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
                  <td class="logo-container" width="40%" style="padding: 20px;">
                    <img src="https://res.cloudinary.com/dp7yxzrgw/image/upload/v1753685727/logos/whiteboardtec-logo_oztrhh.png" alt="Whiteboard Logo" width="150" border="0" style="display: block; width: 150px; max-width: 150px;" />
                  </td>
                  <td class="project-name-container" width="60%" bgcolor="#8cc63f" style="padding: 20px; color: #ffffff; font-weight: bold; font-size: 18px; text-align: left;">
                    ${project.name?.toUpperCase() || "PROJECT NAME"}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td class="content-body" style="padding: 40px 30px; color: #333333; line-height: 1.6;">
              <p style="color: #888888; margin: 0 0 20px 0;">Date: ${new Date().toString()}</p>
              <div style="font-size: 18px; font-weight: bold; margin: 0 0 20px 0;">Subject: IFC Stage Completed — Final Invoice Action Required</div>
              <p style="margin: 0 0 15px 0;">Dear PMO Team,</p>
              <p style="margin: 0 0 15px 0;">This is to formally notify you that the <b>IFC (Issued For Construction) stage</b> for the following project has been <b>successfully completed</b>.</p>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                <tr><td style="padding: 5px 0;"><strong>Project Name:</strong> ${project.name}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Fabricator:</strong> ${fabricator?.fabName || "N/A"}</td></tr>
              </table>

              <p style="margin: 0 0 20px 0;">Please proceed with the <b>final invoice generation</b> in accordance with the agreed scope and commercial terms.</p>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://ps.whiteboardtec.com" style="height:50px;v-text-anchor:middle;width:240px;" arcsize="10%" stroke="f" fillcolor="#8cc63f">
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Login With Your Credentials</center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="https://ps.whiteboardtec.com" style="background-color: #8cc63f; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; line-height: 50px; text-align: center; text-decoration: none; width: 240px; -webkit-text-size-adjust: none; border-radius: 5px; mso-hide: all;">Login With Your Credentials</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 15px 0;">Thanks &amp; Regards,</p>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td class="signature-logo" width="120" valign="top" style="padding-right: 20px;">
                    <img src="https://res.cloudinary.com/dp7yxzrgw/image/upload/v1753685727/logos/whiteboardtec-logo_oztrhh.png" alt="Logo" width="100" border="0" style="display: block; width: 100px;" />
                  </td>
                  <td class="signature-details" valign="top" style="border-left: 1px solid #e0e0e0; padding-left: 20px; color: #777777; font-size: 14px;">
                    <strong style="color: #333333; font-size: 16px;">Project Station</strong><br />
                    Whiteboard Engineering | <a href="https://whiteboardtec.com" style="color: #8cc63f; text-decoration: none;">whiteboardtec.com</a>
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
}

