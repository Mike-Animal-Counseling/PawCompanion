#!/usr/bin/env node
import 'dotenv/config';
import { providerSlotStatus } from '../src/config/providerSlots.js';

const slots = providerSlotStatus(process.env);
const strict = process.argv.includes('--strict');
let missingRequired = 0;

for (const slot of slots) {
  if (!slot.configured) missingRequired += 1;
  const state = slot.configured ? 'configured' : 'not configured';
  console.log(`${slot.configured ? '✓' : '·'} ${slot.slot.padEnd(20)} ${state}`);
  if (!slot.configured) console.log(`  missing: ${slot.missing.join(', ')}`);
  console.log(`  fallback: ${slot.fallback}`);
}

console.log(`\n${slots.filter((slot) => slot.configured).length}/${slots.length} provider slots configured.`);
if (strict && missingRequired > 0) {
  console.error('Strict mode: configure every required slot or remove --strict.');
  process.exit(1);
}
