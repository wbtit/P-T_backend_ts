// Templates/changeOrderInvoiceRequestTemplate.ts

export default function changeOrderInvoiceRequestTemplate(
  projectName: string,
  changeOrderNumber: string,
  approvedBy: string,
  approvedOn: Date,
  remarks: string,
  recipientUsername: string
) {
  const formattedDate = new Date(approvedOn).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>[
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Project Station - Change Order Approved</title>
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
            <img src="https://whiteboardtec.com/wp-content/uploads/2021/05/logo_whiteboard.png" alt="Whiteboard Logo" width="150" />
          </td>
          <td class="project-name-container">
            ${projectName?.toUpperCase() || "PROJECT NAME"}
          </td>
        </tr>
      </table>

      <div class="content-body">
        <p style="color: #888888; margin-bottom: 20px;">Date: ${formattedDate}</p>
        
        <div class="subject-line">Subject: Change Order Approved - ${changeOrderNumber}</div>
        
        <p>Dear ${recipientUsername || "PMO Team"},</p>
        
        <p>This is to inform you that a <b>Change Order has been approved</b> and is now ready for <b>invoice processing</b> in Project Station.</p>

        <p><strong>Approved On:</strong> ${formattedDate}</p>
        <p><strong>Approved By:</strong> ${approvedBy || "Authorized Approver"}</p>
        <p><strong>Remarks / Description:</strong> ${remarks || "—"}</p>

        <div class="btn-container">
          <a href="https://projectstation.whiteboardtec.com" class="btn">Login With Your Credentials</a>
        </div>

        <p>Thanks & Regards,</p>
        
        <table class="signature-table">
          <tr>
            <td class="signature-logo">
              <img src="https://whiteboardtec.com/wp-content/uploads/2021/05/logo_whiteboard.png" alt="Logo" width="100" />
            </td>
            <td class="signature-details">
              <strong style="color: #333333; font-size: 16px;">Project Station</strong><br />
              PMO Team<br />
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

