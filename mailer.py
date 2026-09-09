# smtplib is Python's built-in library to connect to email servers and send emails
import smtplib

# os lets us read environment variables (like passwords stored on the computer or server)
import os

# MIMEText lets us format the email message body with HTML (colors, buttons, text)
from email.mime.text import MIMEText

# MIMEMultipart creates the full email package (holds From, To, Subject, and the body)
from email.mime.multipart import MIMEMultipart

# load_dotenv loads secret keys from a local .env file into Python
from dotenv import load_dotenv

# Run load_dotenv so Python reads the .env file if it exists
load_dotenv()

# The sender email address. If not set in environment, defaults to our platform email
MAIL_USER = os.environ.get('MAIL_USER', 'vahansetu.official@gmail.com')

# The 16-character Gmail App Password. We never write real passwords directly in code for security
MAIL_PASS = os.environ.get('MAIL_PASS', '') 


# Main function to send an email. 
# It takes: recipient email, subject line, main headline, message body, button text, and button link
def send_vahan_email(to_email, subject, title, message, action_text="Visit Dashboard", action_url="http://127.0.0.1:5000/map"):
    
    # SAFETY CHECK (Simulation Mode):
    # If MAIL_PASS is empty (like in local testing or interview demo without real credentials),
    # we don't want the app to crash. We simply print the email in the terminal and return False.
    if not MAIL_PASS:
        try:
            print(f"[SIMULATION] Email to {to_email}: {subject}")
        except Exception:
            pass
        return False

    # This is the HTML design of the email that the user will see in their inbox
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #04060f; color: #ffffff; padding: 20px;">
        <h1 style="color: #00f2ff;">{title}</h1>
        <p>{message}</p>
        <a href="{action_url}" style="background-color: #00f2ff; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px;">{action_text}</a>
    </body>
    </html>
    """

    # Create the email container (like an envelope)
    msg = MIMEMultipart()
    
    # Set the sender name and email
    msg['From'] = f"VahanSetu HQ <{MAIL_USER}>"
    
    # Set the recipient email
    msg['To'] = to_email
    
    # Set the subject line of the email
    msg['Subject'] = subject
    
    # Put the HTML body inside the envelope as HTML text
    msg.attach(MIMEText(html_content, 'html'))

    # Now try to connect to Google's email server and send the email
    try:
        # Step 1: Connect to Gmail SMTP server on standard port 587
        server = smtplib.SMTP('smtp.gmail.com', 587)
        
        # Step 2: Encrypt the connection with TLS security so nobody can intercept the password
        server.starttls()
        
        # Step 3: Login to Gmail using our email and app password
        server.login(MAIL_USER, MAIL_PASS)
        
        # Step 4: Send the email message to the user
        server.send_message(msg)
        
        # Step 5: Close the connection with Gmail server
        server.quit()
        
        # Return True so the caller knows the email was sent successfully
        return True
        
    except Exception:
        # If internet is down or credentials are wrong, return False so the app does not crash
        return False
