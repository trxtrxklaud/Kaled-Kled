import { Router, Request, Response } from 'express';
import { requireAuth } from './middleware.js';
import nodemailer from 'nodemailer';

const router = Router();

router.post('/send', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipientEmail, subject, message, attachments } = req.body;

    const smtpEndpoint = process.env.SMTP_API_ENDPOINT;
    const smtpApiKey = process.env.SMTP_API_KEY;

    if (!smtpEndpoint || !smtpApiKey) {
       res.status(500).json({ success: false, message: 'SMTP configuration is missing' });
       return;
    }

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: 587,
      secure: false,
      auth: {
        user: 'apikey', // Often 'apikey' for services like SendGrid/Mailgun/Brevo
        pass: smtpApiKey,
      },
    });

    // Send email
    await transporter.sendMail({
      from: '"School System" <noreply@school.com>',
      to: recipientEmail,
      subject,
      text: message,
      attachments: attachments?.map((att: any) => {
        // If it's a base64 string
        if (att.base64Data) {
          return {
            filename: att.fileName,
            content: att.base64Data.split('base64,')[1] || att.base64Data,
            encoding: 'base64'
          };
        }
        return {
          filename: att.fileName,
          content: att.blob
        };
      })
    });

    res.json({ success: true, message: 'Email sent successfully via SMTP' });
  } catch (error: any) {
    console.error('Email sending error:', error?.message || error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

export default router;
