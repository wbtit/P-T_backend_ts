// Templates/ifaCompletionInvoiceTemplate.ts

export function ifaCompletionInvoiceTemplate(project: any, fabricator: any) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Whiteboard Engineering - IFA Completion</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f4f4f4;
      padding: 20px 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
    }
    .logo-container {
      padding: 20px;
      width: 40%;
    }
    .project-name-container {
      background-color: #8cc63f;
      padding: 20px;
      color: #ffffff;
      text-align: left;
      width: 60%;
      font-weight: bold;
      font-size: 18px;
    }
    .content-body {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .subject-line {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      background-color: #8cc63f;
      color: #ffffff;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      display: inline-block;
    }
    .signature-table {
      width: 100%;
      margin-top: 30px;
    }
    .signature-logo {
      width: 120px;
      padding-right: 20px;
    }
    .signature-details {
      border-left: 1px solid #e0e0e0;
      padding-left: 20px;
      color: #777777;
      font-size: 14px;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999999;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <table class="header-table">
        <tr>
          <td class="logo-container">
            <img src="https://res.cloudinary.com/dp7yxzrgw/image/upload/v1753685727/logos/whiteboardtec-logo_oztrhh.png" alt="Whiteboard Logo" width="150" />
          </td>
          <td class="project-name-container">
            ${project.name?.toUpperCase() || "PROJECT NAME"}
          </td>
        </tr>
      </table>

      <div class="content-body">
        <p style="color: #888888; margin-bottom: 20px;">Date: ${new Date().toString()}</p>
        
        <div class="subject-line">Subject: IFA Stage Completed — Invoice Action Required</div>
        
        <p>Dear PMO Team,</p>
        
        <p>This is to inform you that the <b>IFA stage</b> for the following project has been <b>successfully completed</b>.</p>

        <p><strong>Project Name:</strong> ${project.name}</p>
        <p><strong>Fabricator:</strong> ${fabricator?.fabName || "N/A"}</p>

        <p>Please proceed with the <b>invoice generation</b> as per the agreed commercial terms.</p>

        <div class="btn-container">
          <a href="https://projectstation.whiteboardtec.com" class="btn">Login With Your Credentials</a>
        </div>

        <p>Thanks & Regards,</p>
        
        <table class="signature-table">
          <tr>
            <td class="signature-logo">
              <img src="https://res.cloudinary.com/dp7yxzrgw/image/upload/v1753685727/logos/whiteboardtec-logo_oztrhh.png" alt="Logo" width="100" />
            </td>
            <td class="signature-details">
              <strong style="color: #333333; font-size: 16px;">Project Station</strong><br />
              Whiteboard Engineering | <a href="https://whiteboardtec.com" style="color: #8cc63f; text-decoration: none;">whiteboardtec.com</a>
            </td>
          </tr>
        </table>
      </div>

      <div class="footer">
        © ${new Date().getFullYear()} Whiteboard Engineering. All Rights Reserved.
      </div>
    </div>
  </div>
</body>
</html>`;
}

