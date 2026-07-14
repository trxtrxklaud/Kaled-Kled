import fs from 'fs';

let code = fs.readFileSync('src/lib/emailDelivery.ts', 'utf8');
code = code.replace(
  /const smtpEndpoint = import\.meta\.env\.VITE_SMTP_API_ENDPOINT as string \| undefined;[\s\S]*?return 'smtp';\n  }/g,
  `// Calling the local backend API which manages the SMTP secret securely
  try {
    const backendAttachments = finalAttachments.map(a => ({ fileName: a.fileName, base64Data: a.content }));
    const payload = {
      recipientEmail,
      subject,
      message,
      attachments: backendAttachments,
    };
    const response = await fetch('/api/email/send', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return 'smtp';
    } else {
      console.warn('Backend SMTP API returned error:', await response.text());
    }
  } catch (error) {
    console.error('Backend API error:', error);
  }`
);
fs.writeFileSync('src/lib/emailDelivery.ts', code);
