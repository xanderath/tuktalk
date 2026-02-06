const THAI_RE = /[\u0E00-\u0E7F]/;
const TONE_AND_MARKS_RE = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g;

const WORD_OVERRIDES: Record<string, string> = {
  'สวัสดี': 'sawatdi',
  'ขอบคุณ': 'khopkhun',
  'รถไฟ': 'rotfai',
  'ประสบการณ์': 'prasopkan',
  'ประเทศไทย': 'prathet thai',
};

const CHAR_MAP: Record<string, string> = {
  'ก': 'k',
  'ข': 'kh',
  'ฃ': 'kh',
  'ค': 'kh',
  'ฅ': 'kh',
  'ฆ': 'kh',
  'ง': 'ng',
  'จ': 'ch',
  'ฉ': 'ch',
  'ช': 'ch',
  'ซ': 's',
  'ฌ': 'ch',
  'ญ': 'y',
  'ฎ': 'd',
  'ฏ': 't',
  'ฐ': 'th',
  'ฑ': 'th',
  'ฒ': 'th',
  'ณ': 'n',
  'ด': 'd',
  'ต': 't',
  'ถ': 'th',
  'ท': 'th',
  'ธ': 'th',
  'น': 'n',
  'บ': 'b',
  'ป': 'p',
  'ผ': 'ph',
  'ฝ': 'f',
  'พ': 'ph',
  'ฟ': 'f',
  'ภ': 'ph',
  'ม': 'm',
  'ย': 'y',
  'ร': 'r',
  'ล': 'l',
  'ว': 'w',
  'ศ': 's',
  'ษ': 's',
  'ส': 's',
  'ห': 'h',
  'ฬ': 'l',
  'อ': 'o',
  'ฮ': 'h',
  'ะ': 'a',
  'า': 'a',
  'ำ': 'am',
  'เ': 'e',
  'แ': 'ae',
  'โ': 'o',
  'ใ': 'ai',
  'ไ': 'ai',
  'ิ': 'i',
  'ี': 'i',
  'ึ': 'ue',
  'ื': 'ue',
  'ุ': 'u',
  'ู': 'u',
  'ั': 'a',
  'ๅ': 'a',
  ' ': ' ',
};

const cleanupRomanization = (value: string) =>
  value
    .replace(/[^a-z0-9 ]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const isThaiText = (value: string) => THAI_RE.test(value);

export const transliterateThaiRtgs = (value: string) => {
  if (!value.trim()) return '';
  const trimmed = value.trim();
  const direct = WORD_OVERRIDES[trimmed];
  if (direct) return direct;

  const stripped = trimmed.replace(TONE_AND_MARKS_RE, '');
  let out = '';
  for (const ch of stripped) {
    out += CHAR_MAP[ch] ?? '';
  }

  return cleanupRomanization(out);
};
