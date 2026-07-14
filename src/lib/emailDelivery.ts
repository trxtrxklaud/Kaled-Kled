import emailjs from '@emailjs/browser';

export interface EmailAttachment {
  fileName: string;
  blob?: Blob;
  base64Data?: string;
}

interface SendEmailParams {
  recipientEmail: string;
  subject: string;
  message: string;
  attachments: EmailAttachment[];
}

const blobToDataUrl = async (blob: Blob): Promise<string> => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

export const sendEmailWithAttachments = async ({
  recipientEmail,
  subject,
  message,
  attachments,
}: SendEmailParams): Promise<'smtp' | 'emailjs' | 'manual'> => {
  // Calling the local backend API which manages the SMTP secret securely
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
  }

  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

  if (!serviceId || !templateId || !publicKey) {
    // Fallback to mailto and manual download of attachments
    const mailtoUrl = `mailto:${recipientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message + '\n\n(Veuillez joindre manuellement les fichiers exportés / Please attach the exported files manually)')}`;
    
    // Automatically trigger downloads for the attachments so the user has them to attach
    attachments.forEach((attachment) => {
        if (attachment.blob) {
            const url = URL.createObjectURL(attachment.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (attachment.base64Data) {
            const a = document.createElement('a');
            a.href = attachment.base64Data.startsWith('data:') ? attachment.base64Data : `data:application/octet-stream;base64,${attachment.base64Data}`;
            a.download = attachment.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    setTimeout(() => {
      const mailtoLink = document.createElement('a');
      mailtoLink.href = mailtoUrl;
      mailtoLink.target = '_top';
      document.body.appendChild(mailtoLink);
      mailtoLink.click();
      document.body.removeChild(mailtoLink);
    }, 500);

    return 'manual';
  }

  if (finalAttachments.length > 5) {
    throw new Error('EmailJS supports up to 5 attachments in this configuration. Configure SMTP/backend for larger payloads.');
  }

  const preparedAttachments = finalAttachments.map((attachment, index) => ({
    [`attachment_${index + 1}_name`]: attachment.fileName,
    [`attachment_${index + 1}_content`]: attachment.content,
  }));

  const templateParams = Object.assign(
    {
      to_email: recipientEmail,
      email: recipientEmail,
      subject,
      message,
    },
    ...preparedAttachments,
  );

  await emailjs.send(serviceId, templateId, templateParams, { publicKey });
  return 'emailjs';
};
