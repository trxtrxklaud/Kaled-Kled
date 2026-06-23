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

export const getAvatarUrl = (name: string, style: 'student' | 'employee' = 'student'): string => {
  const isFemale = isFemaleName(name);
  
  if (style === 'employee') {
    const maleTop = 'shortHair,shortHairDreads01,shortHairDreads02,shortHairShortCurly,shortHairShortFlat,shortHairShortRound,shortHairShortWaved,shortHairSides,shortHairTheCaesar';
    const femaleTop = 'longHairBob,longHairBun,longHairCurly,longHairCurvy,longHairMiaWallace,longHairStraight';
    const top = isFemale ? femaleTop : maleTop;
    const clothing = isFemale ? 'blazerAndShirt,blazerAndSweater,collarAndSweater' : 'blazerAndShirt,blazerAndSweater,shirtCrewNeck,collarAndSweater';
    const facialHair = isFemale ? '0' : '20';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=f8fafc&top=${top}&clothing=${clothing}&facialHairProbability=${facialHair}`;
  } else {
    // For students, maybe simpler or younger looking
    const maleTop = 'shortHair,shortHairShaggyMultipile,shortHairShortCurly,shortHairShortFlat,shortHairShortRound,shortHairShortWaved';
    const femaleTop = 'longHairBigHair,longHairBob,longHairBun,longHairCurly,longHairCurvy,longHairStraight';
    const top = isFemale ? femaleTop : maleTop;
    const clothing = 'hoodie,overall,shirtCrewNeck';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=f8fafc&top=${top}&clothing=${clothing}&facialHairProbability=0`;
  }
};

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
    console.error('Error downloading file:', err);
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
      console.error('Error writing to print window:', e);
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
    console.error(err);
    window.print(); // fallback
  }
}

