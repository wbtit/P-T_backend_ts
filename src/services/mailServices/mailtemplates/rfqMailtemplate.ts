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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Project Station - RFQ Notification</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .email-wrapper { width: 100%; background-color: #f4f4f4; padding: 20px 0; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; }
    .header-table { width: 100%; border-collapse: collapse; }
    .logo-container { padding: 20px; width: 40%; }
    .project-name-container { background-color: #8cc63f; padding: 20px; color: #ffffff; text-align: left; width: 60%; font-weight: bold; font-size: 18px; }
    .content-body { padding: 40px 30px; color: #333333; line-height: 1.6; }
    .subject-line { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    .details-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
    .details-table td:first-child { color: #888888; width: 140px; font-weight: bold; }
    .recipients-list { background-color: #f9f9f9; border-left: 3px solid #8cc63f; padding: 10px 15px; margin: 15px 0; font-size: 14px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { background-color: #8cc63f; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
    .signature-table { width: 100%; margin-top: 30px; }
    .signature-logo { width: 120px; padding-right: 20px; }
    .signature-details { border-left: 1px solid #e0e0e0; padding-left: 20px; color: #777777; font-size: 14px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #999999; }
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
            ${newrfq.project?.name?.toUpperCase() || "PROJECT NAME"}
          </td>
        </tr>
      </table>

      <div class="content-body">
        <p style="color: #888888; margin-bottom: 20px;">Date: ${new Date().toDateString()}</p>

        <div class="subject-line">Subject: ${newrfq.subject || "RFQ Notification"}</div>

        <p>Dear ${greeting},</p>

        <p>You have been notified about a new <strong>Request for Quotation (RFQ)</strong>. Please find the details below:</p>

        <table class="details-table">
          <tr><td>Reference</td><td>${newrfq.serialNo || "N/A"}</td></tr>
          <tr><td>Project</td><td>${newrfq.project?.name || "N/A"}</td></tr>
          <tr><td>Subject</td><td>${newrfq.subject || "N/A"}</td></tr>
          <tr><td>Status</td><td>${newrfq.status || "N/A"}</td></tr>
          <tr><td>Sender</td><td>${[newrfq.sender?.firstName, newrfq.sender?.lastName].filter(Boolean).join(" ") || newrfq.sender?.username || "N/A"}</td></tr>
          <tr><td>Date</td><td>${newrfq.createdAt ? new Date(newrfq.createdAt).toDateString() : new Date().toDateString()}</td></tr>
        </table>

        ${recipientNames.length > 1 ? `
        <div class="recipients-list">
          <strong>All Recipients:</strong><br/>
          ${recipientNames.join(" &nbsp;|&nbsp; ")}
        </div>` : ""}

        <div class="btn-container">
          <a href="https://ps.whiteboardtec.com" class="btn">Login to View RFQ</a>
        </div>

        <p>Thanks &amp; Regards,</p>

        <table class="signature-table">
          <tr>
            <td class="signature-logo">
              <img src="https://res.cloudinary.com/dp7yxzrgw/image/upload/v1753685727/logos/whiteboardtec-logo_oztrhh.png" alt="Logo" width="100" />
            </td>
            <td class="signature-details">
              <strong style="color: #333333; font-size: 16px;">${newrfq.sender?.username || "Project Station"}</strong><br />
              ${newrfq.sender?.designation || "N/A"}<br />
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
};
