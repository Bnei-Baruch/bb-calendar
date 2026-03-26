#!/usr/bin/env node
// One-time script to authenticate with Telegram and save the session string.
// Run: node telegram-auth.js
// Then copy the printed session string into telegram-session.txt

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import * as readline from 'readline';

const API_ID = 36986128;
const API_HASH = 'b1a1bf07bca5f6f56c09edbfb1051b95';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

const client = new TelegramClient(new StringSession(''), API_ID, API_HASH, {
  connectionRetries: 5,
});

await client.start({
  phoneNumber: async () => await ask('Phone number (with country code, e.g. +972501234567): '),
  password: async () => await ask('2FA password (leave blank if none): '),
  phoneCode: async () => await ask('Telegram code you received: '),
  onError: (err) => console.error(err),
});

const sessionString = client.session.save();
console.log('\n✅ Authenticated successfully!\n');
console.log('Session string (save this to telegram-session.txt):');
console.log(sessionString);

import { writeFileSync } from 'fs';
writeFileSync('telegram-session.txt', sessionString, 'utf-8');
console.log('\n✅ Also saved automatically to telegram-session.txt');

await client.disconnect();
rl.close();
