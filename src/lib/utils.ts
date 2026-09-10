import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isFemaleName = (name: string): boolean => {
  const lowercaseName = name.toLowerCase().trim();
  const firstName = lowercaseName.split(' ')[0];
  const lastPart = lowercaseName.split(' ').pop() || lowercaseName;
  
  const femaleEndings = ['a', 'ah', 'ee', 'ia', 'ine', 'elle', 'etta', 'y', 'ة'];
  const commonFemaleNames = ['fatima', 'aisha', 'khadija', 'maryam', 'sarah', 'زينب', 'خديجة', 'فاطمة', 'عائشة', 'مريم', 'سارة', 'سلمى', 'هند', 'rania', 'noura', 'leila'];
  
  if (commonFemaleNames.some(n => firstName.includes(n))) return true;
  if (femaleEndings.some(suffix => firstName.endsWith(suffix) || lastPart.endsWith(suffix))) return true;
  
  return false;
};

/**
 * أفاتار محلي 100% (SVG data-URI): أول حرفين من الاسم على خلفية ملوّنة حتمية.
 * يعمل دون اتصال ولا يعتمد على أي خدمة خارجية. نفس التوقيع السابق.
 */
export const getAvatarUrl = (name: string, _style: 'student' | 'employee' = 'student'): string => {
  const clean = (name || '').trim() || '?';
  const initials = clean.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < clean.length; i += 1) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">`
    + `<rect width="96" height="96" rx="48" fill="hsl(${hue},45%,42%)"/>`
    + `<text x="48" y="60" font-family="sans-serif" font-size="36" font-weight="bold" `
    + `fill="#ffffff" text-anchor="middle">${initials.replace(/[<>&"]/g, '')}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/** صورة الاحتياط المحلية عند فشل تحميل أي صورة (بدل خدمات خارجية). */
export const FALLBACK_AVATAR = getAvatarUrl('?');

export const safeOpenExternalLink = (url: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_top'; // use _top to break out of iframe, or _blank for new tab. 
  // Let's use _blank to keep app alive
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
};

export const downloadFile = (dataUrl: string, filename: string) => {
  if (!dataUrl) return;
  
  try {
    // If it's a data URL, convert to Blob
    let urlToDownload = dataUrl;
    let isObjectUrl = false;
    
    if (dataUrl.startsWith('data:')) {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : '';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      urlToDownload = URL.createObjectURL(blob);
      isObjectUrl = true;
    }

    const a = document.createElement('a');
    a.href = urlToDownload;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      if (isObjectUrl) {
        URL.revokeObjectURL(urlToDownload);
      }
    }, 100);
  } catch (err) {
    console.error('Error downloading file:', err?.message || err);
    // Fallback if data is not large or simply fails
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  }
};

export const printHtmlContent = (htmlContent: string, title: string = 'Document') => {
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    let finalHtml = htmlContent;
    
    if (!finalHtml.includes('<html')) {
       finalHtml = `<!DOCTYPE html><html><head><title>${title}</title><meta charset="utf-8" /></head><body style="margin:0; padding:0; background: white;">${finalHtml}</body></html>`;
    }
    
    if (finalHtml.includes('</body>')) {
      finalHtml = finalHtml.replace('</body>', `<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script></body>`);
    } else {
      finalHtml += `<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>`;
    }

    try {
      printWindow.document.open();
      printWindow.document.write(finalHtml);
      printWindow.document.title = title;
      printWindow.document.close();
      printWindow.focus();
    } catch(e) {
      console.error('Error writing to print window:', e?.message || e);
      window.print();
    }
  } else {
    console.warn('Print window blocked by popup blocker, falling back to window.print()');
    window.print();
  }
};

export const triggerPrint = () => {
  try {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    const scripts = clone.querySelectorAll('script');
    scripts.forEach(s => s.remove());
    
    const baseTag = `<base href="${window.location.origin}${window.location.pathname}">`;
    const headHtml = clone.querySelector('head')?.innerHTML || '';
    const bodyHtml = clone.querySelector('body')?.innerHTML || '';
    
    const htmlContent = `<!DOCTYPE html><html><head>${baseTag}${headHtml}</head><body>${bodyHtml}</body></html>`;
    printHtmlContent(htmlContent, document.title);
  } catch (err) {
    console.error(err?.message || err);
    window.print(); // fallback
  }
}

