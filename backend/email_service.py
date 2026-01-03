import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

# Email Configuration - Update with your Gmail credentials
MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 587
MAIL_USER = 'events.campus.team@gmail.com'
MAIL_PASS = 'vhklyihtlzooumgl'
MAIL_FROM = 'Campus Events Team <events.campus.team@gmail.com>'

def send_approval_email(to_email, name):
    """Send account approval notification email"""
    try:
        msg = MIMEMultipart()
        msg['Subject'] = '✅ Account Approved - SEMS'
        msg['From'] = MAIL_FROM
        msg['To'] = to_email
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                        School Event Management System
                                    </h1>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 50px 40px;">
                                    <h2 style="margin: 0 0 30px 0; color: #111827; font-size: 28px; font-weight: 700; text-align: center;">
                                        Account Approved!
                                    </h2>
                                    
                                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                        Hi <strong>{name}</strong>,
                                    </p>
                                    
                                    <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                        Your account has been approved by the administrator. You can now sign in to the School Event Management System using your registered credentials.
                                    </p>
                                    
                                    <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
                                        <p style="margin: 0 0 15px 0; color: #111827; font-size: 15px; font-weight: 600;">
                                            What you can do now:
                                        </p>
                                        <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.8;">
                                            • Sign in with your registered username and password<br>
                                            • Browse and register for upcoming campus events<br>
                                            • Track your event attendance<br>
                                            • Submit feedback after attending events
                                        </p>
                                    </div>
                                    
                                    <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6; text-align: center;">
                                        Welcome to the community!
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                    <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">
                                        Campus Events Team
                                    </p>
                                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                        This is an automated message. Please do not reply to this email.
                                    </p>
                                </td>
                            </tr>
                            
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html, 'html'))
        
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            server.starttls()
            server.login(MAIL_USER, MAIL_PASS)
            server.send_message(msg)
        
        logger.info(f"Approval email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False
