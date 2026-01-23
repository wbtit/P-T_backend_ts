export const rfqhtmlContent=(newrfq:any)=>{
    return `<!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Project Station - RFQ Notification</title>
              <style>
                body {
                  font-family: 'Courier New', Courier, monospace;
                  background-color: #f2fdf3; /* Light greenish background */
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
                  margin-top: 15px;
                }
          
                a {
                  color: #6adb45;
                  text-decoration: none;
                  font-weight: bold;
                }
          
                .green-text {
                  color: #6adb45;
                }
          
                h2 {
                  font-size: 20px;
                  color: #333;
                  margin-top: 20px;
                }
          
                p {
                  font-size: 16px;
                  color: #555;recepient_id
                }
          
                /* Ensure logo is centered in footer */
                .footer {
                  text-align: center;
                  margin-top: 40px;
                }
          
                .footer img {
                  max-width: 150px;
                  display: block;
                  margin-left: auto;
                  margin-right: auto;
                }
          
                /* Ensure the email container is centered */
                .email-container {
                  text-align: center;
                }
              </style>
          </head>
          
          <body>
              <div class="email-container">
                  <div class="d-flex justify-content-between align-items-center">
                  <div class="title">
                      <span>You’ve Received a New RFQ</span><br/>
                      <span><strong>Project:</strong> ${newrfq.projectName}</span>
                  </div>
                  <div> 
                      <img 
                          src="https://firebasestorage.googleapis.com/v0/b/whiteboard-website.appspot.com/o/assets%2Fimage%2Flogo%2Fwhiteboardtec-logo.png?alt=media&token=f73c5257-9b47-4139-84d9-08a1b058d7e9"
                          alt="Company Logo" 
                          style="max-width: 100px;" />
                  </div>
              </div>
                  <div class="email-body">
                      <h2>Welcome to Project Station, <b>${newrfq.recipient.username}</b>!</h2>
                      <p>You have received a new RFQ notification. Here are the details:</p>
          
                      <p><strong>Project Name:</strong> ${newrfq.projectName}</p>
                      <p><strong>Sender:</strong> ${newrfq.sender.username}</p>
                      <p><strong>Date:</strong> ${newrfq.date}</p>
                      <p><strong>Subject:</strong> ${newrfq.subject}</p>
                      <p>You can check your RFQ by clicking the link <a href="projectstation.whiteboardtec.com">here</a>.</p>
          
                      <div class="card">
                          <div class="card-body">
                              ${newrfq.description}
                       OPEN   </div>
                      </div>
          
                      <p>Thanks & Regards,</p>
                      <p><b> ${newrfq.sender.username}</b></p>
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
          </html>
          `;
}