import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ══════════════════════════════════════════════════════════════════════
# VAHANSETU — SECURE MESSAGING ENGINE v1.0
# ──────────────────────────────────────────────────────────────────────
# Note: For production, set MAIL_USER and MAIL_PASS (Gmail App Password)
# in your environment variables.
# ══════════════════════════════════════════════════════════════════════

MAIL_USER = os.environ.get('MAIL_USER', 'vahansetu.official@gmail.com')
MAIL_PASS = os.environ.get('MAIL_PASS', '') # User should set their App Password

def send_vahan_email(to_email, subject, title, message, action_text="Visit Dashboard", action_url="http://127.0.0.1:5000/map"):
    """Sends a high-fidelity branded HTML email to the user."""
    
    if not MAIL_PASS:
        print(f"📡 [SIMULATION] Email to {to_email}: {subject}")
        print(f"   Content: {message}")
        return False

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

    msg = MIMEMultipart()
    msg['From'] = f"VahanSetu HQ <{MAIL_USER}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(MAIL_USER, MAIL_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ [MAILER ERROR] Failed to send to {to_email}: {e}")
        return False
