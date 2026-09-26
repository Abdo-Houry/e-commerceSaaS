import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

/*
 * The monorepo keeps one .env at the root. Next only loads .env files from the
 * app directory (and resets process.env when it does), so server code reads the
 * root file directly. Real environment variables always take precedence.
 */
let rootEnv: Record<string, string | undefined> | null = null;

function fromRootFile(key: string): string | undefined {
  if (!rootEnv) {
    rootEnv = {};
    // cwd is frontend/ under `npm run dev -w`, or the repo root in some setups.
    for (const file of [path.resolve(process.cwd(), '..', '.env'), path.resolve(process.cwd(), '.env')]) {
      if (fs.existsSync(file)) {
        rootEnv = parseEnv(fs.readFileSync(file, 'utf8'));
        break;
      }
    }
  }
  return rootEnv[key];
}

function read(key: string): string | undefined {
  return process.env[key] || fromRootFile(key);
}

export const serverEnv = {
  get revalidateSecret() {
    return read('REVALIDATE_SECRET') ?? '';
  },
  get apiInternalUrl() {
    return read('API_INTERNAL_URL') ?? read('NEXT_PUBLIC_API_URL') ?? 'http://localhost:4000/api';
  },
};
