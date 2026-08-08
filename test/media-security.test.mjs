import assert from 'node:assert/strict';
import test from 'node:test';
import {isPrivateAddress, safeMediaFilename} from '../src/server/media-security.mjs';

test('blocks private, local, reserved, and documentation addresses', () => {
  for (const address of [
    '0.0.0.0',
    '10.2.3.4',
    '127.0.0.1',
    '169.254.1.2',
    '172.16.0.1',
    '192.168.0.1',
    '198.18.0.1',
    '203.0.113.5',
    '::1',
    'fc00::1',
    'fe80::1',
    '2001:db8::1',
  ]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
});

test('allows ordinary public IP addresses', () => {
  assert.equal(isPrivateAddress('1.1.1.1'), false);
  assert.equal(isPrivateAddress('8.8.8.8'), false);
  assert.equal(isPrivateAddress('2606:4700:4700::1111'), false);
});

test('normalizes media filenames and rejects executable or hidden output', () => {
  assert.equal(safeMediaFilename('../../My clip.MP4'), 'My-clip.MP4');
  assert.throws(() => safeMediaFilename('payload.exe'), /Unsupported media filename/);
  assert.throws(() => safeMediaFilename('.hidden.mp4'), /Unsupported media filename/);
});
