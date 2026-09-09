# ══════════════════════════════════════════════════════════════════════════════
#   VAHANSETU — SECURE MESSAGING ENGINE (v1.0 Production)
# ══════════════════════════════════════════════════════════════════════════════
#
#   INTERVIEW EXPLANATION:
#   ────────────────────────────────────────────────────────────────────────────
#   This module handles automated transactional email notifications (welcome emails,
#   security alerts on new logins, and CPO revenue updates).
#
#   Technical Features:
#   - Uses Python's standard `smtplib` over port 587 with STARTTLS encryption.
#   - MIMEMultipart formatting with responsive, dark-mode branded HTML templates.
#   - Simulation Mode: If MAIL_PASS is not configured in environment variables,
#     it logs email payloads to stdout without raising errors, ensuring local dev
#     and interview demos run smoothly without breaking.
# ══════════════════════════════════════════════════════════════════════════════

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configured sender email address (defaults to official platform account)
MAIL_USER = os.environ.get('MAIL_USER', 'vahansetu.official@gmail.com')

# Google App Password (generated via Google Account Security > 2-Step Verification > App Passwords)
MAIL_PASS = os.environ.get('MAIL_PASS', '')


def send_vahan_email(to_email, subject, title, message, action_text="Visit Dashboard", action_url="http://127.0.0.1:5000/map"):
    """
    Sends a branded, high-fidelity transactional HTML email to the recipient.
    
    Parameters:
    - to_email: Recipient email address
    - subject: Email subject line
    - title: Large hero heading inside the email card
    - message: Body text explaining the event
    - action_text / action_url: Call-to-action button linking back to the platform
    """
    
    # Simulation fallback: when no Gmail App Password is provided in environment variables,
    # print simulated email to console and exit gracefully without throwing an exception.
    if not MAIL_PASS:
        try:
            print(f"[EMAIL SIMULATION] Recipient: {to_email} | Subject: {subject}")
            print(f"   Content: {message}")
        except Exception:
            pass
        return False

    # Responsive, dark-themed HTML email template matching VahanSetu's design language
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ margin:0; padding:0; font-family:'Inter', sans-serif; background-color:#04060f; color:#ffffff; }}
            .container {{ max-width:600px; margin:40px auto; background-color:#080d1c; border-radius:24px; border:1px solid #1a243d; overflow:hidden; }}
            .header {{ padding:40px; text-align:center; background:linear-gradient(135deg, #04060f 0%, #080d1c 100%); border-bottom:1px solid #1a243d; }}
            .content {{ padding:40px; line-height:1.6; color:#a0aec0; }}
            .footer {{ padding:30px; text-align:center; font-size:12px; color:#4a5568; border-top:1px solid #1a243d; }}
            .btn {{ display:inline-block; padding:16px 32px; background-color:#00f2ff; color:#000000; text-decoration:none; border-radius:12px; font-weight:800; font-size:14px; margin-top:24px; }}
            .accent {{ color:#00f2ff; font-weight:800; }}
            .logo-text {{ font-size:24px; font-weight:900; letter-spacing:2px; color:#ffffff; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo-text">VAHAN<span style="color:#00f2ff;">SETU</span></div>
                <div style="font-size:12px; letter-spacing:4px; color:rgba(255,255,255,0.4); margin-top:5px;">UNIFIED EV ECOSYSTEM</div>
            </div>
            <div class="content">
                <h1 style="color:#ffffff; font-size:24px; margin-bottom:20px;">{title}</h1>
                <p>{message}</p>
                <div style="text-align:center;">
                    <a href="{action_url}" class="btn">{action_text}</a>
                </div>
                <p style="margin-top:30px; font-size:13px;">If you did not authorize this action, please reset your <span class="accent">Access Key</span> immediately in your profile stewardship settings.</p>
            </div>
            <div class="footer">
                © 2026 VahanSetu Technologies · India's Premier EV Network<br>
                Safeguarding the Electric Future.
            </div>
        </div>
    </body>
    </html>
    """

    # Assemble MIME email package
    msg = MIMEMultipart()
    msg['From'] = f"VahanSetu HQ <{MAIL_USER}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_content, 'html'))

    try:
        # Connect to Google SMTP server on port 587
        server = smtplib.SMTP('smtp.gmail.com', 587, timeout=5)
        # Upgrade plaintext connection to encrypted TLS (Transport Layer Security)
        server.starttls()
        # Authenticate with credentials
        server.login(MAIL_USER, MAIL_PASS)
        # Transmit email
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        try:
            print(f"[MAILER ERROR] Failed to send email to {to_email}: {e}")
        except Exception:
            pass
        return False
