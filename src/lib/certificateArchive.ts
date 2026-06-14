import JSZip from 'jszip';
import type { AttachmentPayload } from './pdfReports';

export const buildZipAttachment = async (
  attachments: AttachmentPayload[],
  zipFileName: string,
): Promise<AttachmentPayload> => {
  const zip = new JSZip();

  await Promise.all(attachments.map(async (attachment) => {
    const arrayBuffer = await attachment.blob.arrayBuffer();
    zip.file(attachment.fileName, arrayBuffer);
  }));

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return {
    fileName: zipFileName,
    blob: zipBlob,
  };
};

export const buildCertificateZipAttachment = buildZipAttachment;
