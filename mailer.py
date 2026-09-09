# Import smtplib to send email using Gmail server
import smtplib

# Import os to read password from computer environment variables
import os

# Import MIMEText to write email message in HTML format
from email.mime.text import MIMEText

# Import MIMEMultipart to create the email message body
from email.mime.multipart import MIMEMultipart

# Import load_dotenv to read secrets from .env file
from dotenv import load_dotenv

# Load the .env file
load_dotenv()

# Our sender Gmail address
MAIL_USER = os.environ.get('MAIL_USER', 'vahansetu.official@gmail.com')

# Our Gmail App Password (kept empty if not set)
MAIL_PASS = os.environ.get('MAIL_PASS', '') 


# Function to send email to the user
# Arguments explained:
# to_email   = receiver email address
# subject    = subject line of email
# title      = heading text shown inside email
# message    = text message shown inside email
# action_text = button name (like 'Visit Dashboard')
# action_url  = link where button takes the user
def send_vahan_email(to_email, subject, title, message, action_text="Visit Dashboard", action_url="http://127.0.0.1:5000/map"):
    
    # Check if Gmail password is set.
    # If password is not set (testing or demo), don't crash the code,
    # just print in terminal that email is simulated and return False
    if not MAIL_PASS:
        try:
            print(f"[SIMULATION] Email to {to_email}: {subject}")
        except Exception:
            pass
        return False

    # HTML design of the email (dark background, colored heading, and clickable button)
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #04060f; color: #ffffff; padding: 20px;">
        <h1 style="color: #00f2ff;">{title}</h1>
        <p>{message}</p>
        <a href="{action_url}" style="background-color: #00f2ff; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px;">{action_text}</a>
    </body>
    </html>
    """

    # Create the email message container
    msg = MIMEMultipart()
    
    # Set From email address
    msg['From'] = f"VahanSetu HQ <{MAIL_USER}>"
    
    # Set To email address
    msg['To'] = to_email
    
    # Set Email Subject
    msg['Subject'] = subject
    
    # Attach our HTML message inside the email
    msg.attach(MIMEText(html_content, 'html'))

    try:
        # Step 1: Connect to Gmail SMTP server on port 587
        server = smtplib.SMTP('smtp.gmail.com', 587)
        
        # Step 2: Turn on TLS encryption for security
        server.starttls()
        
        # Step 3: Login with our Gmail username and app password
        server.login(MAIL_USER, MAIL_PASS)
        
        # Step 4: Send the email message to the receiver
        server.send_message(msg)
        
        # Step 5: Close connection with Gmail server
        server.quit()
        
        # Return True if email sent successfully
        return True
        
    except Exception:
        # If internet is not working or credentials wrong, return False so app does not crash
        return False
