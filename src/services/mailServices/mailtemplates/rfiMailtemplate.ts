export const rfihtmlContent = (newrfi: any) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Project Station - RFI Notification</title>
  <style>
    body {
      font-family: 'Courier New', Courier, monospace;
      background-color: #f2fdf3;
      color: #333;
      margin: 0;
      padding: 0;
    }

    .email-container {
      background-color: #ffffff;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      border-radius: 10px;
      padding: 35px;
      margin-top: 50px;
      max-width: 650px;
      margin-left: auto;
      margin-right: auto;
    }

    .email-header {
      background-color: #6adb45;
      color: white;
      padding: 25px;
      border-radius: 8px;
      text-align: center;
    }

    .email-header .title {
      font-size: 26px;
      font-weight: bold;
      margin: 0;
    }

    .email-body {
      margin-top: 25px;
      text-align: left;
      line-height: 1.6;
    }

    .card {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 25px;
      margin-top: 30px;
      border: none;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 14px;
      color: #555;
    }

    .footer img {
      max-width: 150px;
      display: block;
      margin: 15px auto;
    }

    a {
      color: #6adb45;
      text-decoration: none;
      font-weight: bold;
    }

    h2 {
      font-size: 20px;
      color: #333;
      margin-top: 20px;
    }

    p {
      font-size: 16px;
      color: #555;
    }
  </style>
</head>

<body>
  <div class="email-container">

    <div class="email-header">
      <div class="title">You’ve Received a New RFI</div>
      <p><strong>Project:</strong> ${newrfi?.project?.name || "N/A"}</p>
    </div>

    <div class="email-body">
      <h2>Welcome to Project Station, <b>${newrfi?.recepients?.username || "User"}</b>!</h2>
      <p>You have received a new RFI notification. Here are the details:</p>

      <p><strong>Project Name:</strong> ${newrfi?.project?.name || "N/A"}</p>
      <p><strong>Sender:</strong> ${newrfi?.sender?.username || "N/A"}</p>
      <p><strong>Date:</strong> ${newrfi?.date || new Date().toLocaleDateString()}</p>
      <p><strong>Subject:</strong> ${newrfi?.subject || "No subject"}</p>

      <p>
        You can check your RFI by clicking the link 
        <a href="https://projectstation.whiteboardtec.com" target="_blank">here</a>.
      </p>

      <div class="card">
        <div class="card-body">
          ${newrfi?.description || "No description provided."}
        </div>
      </div>

      <p>Thanks & Regards,</p>
      <p><b>${newrfi?.sender?.username || "Team Project Station"}</b></p>
      <p>Bangalore</p>
    </div>

    <div class="footer">
      <img
        src="https://firebasestorage.googleapis.com/v0/b/whiteboard-website.appspot.com/o/assets%2Fimage%2Flogo%2Fwhiteboardtec-logo.png?alt=media&token=f73c5257-9b47-4139-84d9-08a1b058d7e9"
        alt="Company Logo"
      />
      <p><b>Whiteboard Technologies Pvt. Ltd.</b></p>
      <p>Bangalore</p>
    </div>
  </div>
</body>
</html>`;
};
