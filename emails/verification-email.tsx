interface VerificationEmailProps {
  verificationUrl: string
  email: string
}

export const VerificationEmail = ({ verificationUrl, email }: VerificationEmailProps) => {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Welcome to Cloud Airline</title>
        <style>
          {`
            /* Base */
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
              background-color: #f8f5f2;
              color: #3a4f5c;
              height: 100% !important;
              line-height: 1.4;
              margin: 0;
              padding: 0;
              -webkit-text-size-adjust: none;
            }
            
            .email-wrapper {
              width: 100%;
              margin: 0;
              padding: 0;
              background-color: #f8f5f2;
            }
            
            .email-content {
              width: 100%;
              margin: 0;
              padding: 0;
            }
            
            /* Container */
            .email-container {
              width: 100%;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            
            /* Header */
            .email-header {
              text-align: center;
              padding: 20px 0;
            }
            
            .email-logo {
              max-width: 180px;
              height: auto;
            }
            
            /* Body */
            .email-body {
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
              margin: 0 auto;
              padding: 40px;
            }
            
            .email-heading {
              color: #0f2d3c;
              font-size: 24px;
              font-weight: 700;
              text-align: center;
              margin: 0 0 20px;
            }
            
            .email-text {
              color: #3a4f5c;
              font-size: 16px;
              line-height: 1.5;
              margin: 0 0 20px;
            }
            
            /* Button */
            .email-button-container {
              text-align: center;
              margin: 30px 0;
            }
            
            .email-button {
              background-color: #8a7a4e;
              border-radius: 4px;
              color: #ffffff !important;
              display: inline-block;
              font-size: 16px;
              font-weight: 600;
              line-height: 1;
              padding: 15px 30px;
              text-decoration: none;
              text-align: center;
            }
            
            /* Footer */
            .email-footer {
              text-align: center;
              padding: 20px 0;
            }
            
            .email-footer-text {
              color: #8898aa;
              font-size: 13px;
              line-height: 1.5;
            }
            
            .email-footer-link {
              color: #8898aa;
              text-decoration: underline;
            }
            
            .email-divider {
              border: none;
              border-top: 1px solid #dfe1e4;
              margin: 30px 0;
            }
          `}
        </style>
      </head>
      <body>
        <div className="email-wrapper">
          <div className="email-content">
            <table className="email-container" border="0" cellPadding="0" cellSpacing="0" width="100%">
              <tr>
                <td>
                  <div className="email-header">
                    <img
                      src={`https://www.cloud-airlines.space/logo.png`}
                      alt="Cloud Airline"
                      className="email-logo"
                      width="180"
                    />
                  </div>
                  <div className="email-body">
                    <h1 className="email-heading">Welcome to COSMILE</h1>
                    <p className="email-text">Dear valued member,</p>
                    <p className="email-text">
                      Thank you for joining the premium frequent flyer program of Cloud Airline. We're excited to have
                      you on board!
                    </p>
                    <p className="email-text">
                      To complete your registration and secure your account, please set your password by clicking the
                      button below.
                    </p>
                    <div className="email-button-container">
                      <a href={verificationUrl} className="email-button">
                        Set Your Password
                      </a>
                    </div>
                    <p className="email-text">
                      If the button doesn't work, you can also copy and paste the following link into your browser:
                    </p>
                    <p className="email-text" style={{ wordBreak: "break-all" }}>
                      <a href={verificationUrl}>{verificationUrl}</a>
                    </p>
                    <p className="email-text">
                      If you didn't request this email, there's nothing to worry about - you can safely ignore it.
                    </p>
                    <hr className="email-divider" />
                    <p className="email-text" style={{ fontSize: "14px", color: "#666" }}>
                      This link will expire in 24 hours for security reasons.
                    </p>
                  </div>
                  <div className="email-footer">
                    <p className="email-footer-text">
                      © {new Date().getFullYear()} Cloud Airline. All rights reserved.
                    </p>
                    <p className="email-footer-text">
                      <a href="https://www.cloud-airlines.space/privacy" className="email-footer-link">
                        Privacy Policy
                      </a>{" "}
                      •
                      <a href="https://www.cloud-airlines.space/terms" className="email-footer-link">
                        Terms of Service
                      </a>
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </body>
    </html>
  )
}

export default VerificationEmail
