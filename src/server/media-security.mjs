import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import path from 'node:path';

export const ALLOWED_MEDIA_EXTENSIONS = new Set([
  '.aac',
  '.gif',
  '.jpeg',
  '.jpg',
  '.m4a',
  '.m4v',
  '.mov',
  '.mp3',
  '.mp4',
  '.ogg',
  '.png',
  '.wav',
  '.webm',
  '.webp',
]);

const isPrivateIpv4 = (address) => {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return true;
  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && octets[2] === 0) ||
    (first === 192 && second === 0 && octets[2] === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && octets[2] === 100) ||
    (first === 203 && second === 0 && octets[2] === 113) ||
    first >= 224
  );
};

const isPrivateIpv6 = (address) => {
  const normalized = address.toLowerCase();
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith('ff') || normalized.startsWith('2001:db8:')) return true;
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    return isIP(mapped) === 4 ? isPrivateIpv4(mapped) : true;
  }
  return false;
};

export const isPrivateAddress = (address) => {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
};

export const validateRemoteUrl = async (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Media URL is invalid.');
  }
  if (url.protocol !== 'https:') {
    throw new Error('CUTS only downloads media over HTTPS.');
  }
  if (url.username || url.password) {
    throw new Error('Credentials are not allowed in media URLs.');
  }
  const addresses = await lookup(url.hostname, {all: true, verbatim: true});
  if (addresses.length === 0 || addresses.some(({address}) => isPrivateAddress(address))) {
    throw new Error('Media URLs may not resolve to a private or local network address.');
  }
  return url;
};

export const safeMediaFilename = (value) => {
  const basename = path.basename(value).replace(/[^a-zA-Z0-9._-]+/g, '-');
  const extension = path.extname(basename).toLowerCase();
  if (!basename || basename.startsWith('.') || !ALLOWED_MEDIA_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported media filename: ${value}`);
  }
  return basename;
};
