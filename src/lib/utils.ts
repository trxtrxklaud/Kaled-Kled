import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export const triggerPrint = () => {
  try {
    window.print();
  } catch (err) {
    console.error(err);
  }
}
