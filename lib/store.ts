import { promises as fs } from "fs";
import path from "path";
import type { AppState, ChatMessage, Match, Profile } from "./types";

// A dead-simple JSON file store. This is a personal, single-user tool, so a
// file on disk is plenty — no database, no native modules, runs anywhere.
// Swap this module for Postgres/Supabase later without touching the agent.

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY: AppState = { profile: {}, messages: [], matches: [] };

// Serialize writes so concurrent requests can't clobber the file.
let writeChain: Promise<void> = Promise.resolve();

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(EMPTY, null, 2));
  }
}

export async function readState(): Promise<AppState> {
  await ensureFile();
  const raw = await fs.readFile(DB_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      profile: parsed.profile ?? {},
      messages: parsed.messages ?? [],
      matches: parsed.matches ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

async function writeState(state: AppState): Promise<void> {
  await ensureFile();
  await fs.writeFile(DB_FILE, JSON.stringify(state, null, 2));
}

// Read-modify-write under a mutex so we never lose updates.
export function mutate<T>(fn: (state: AppState) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const state = await readState();
    const result = await fn(state);
    await writeState(state);
    return result;
  };
  const result = writeChain.then(run, run);
  // Keep the chain alive but swallow errors so one failure doesn't wedge it.
  writeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export async function addMessage(
  role: ChatMessage["role"],
  text: string,
): Promise<ChatMessage> {
  return mutate((state) => {
    const msg: ChatMessage = {
      id: newId("msg"),
      role,
      text,
      createdAt: Date.now(),
    };
    state.messages.push(msg);
    return msg;
  });
}

export async function mergeProfile(patch: Partial<Profile>): Promise<Profile> {
  return mutate((state) => {
    const merged: Profile = { ...state.profile };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null) continue;
      // Append (de-duped) for list fields; overwrite scalars.
      if (Array.isArray(value)) {
        const existing = (merged as Record<string, unknown>)[key];
        const prev = Array.isArray(existing) ? (existing as unknown[]) : [];
        const combined = [...prev];
        for (const v of value) {
          if (!combined.includes(v)) combined.push(v);
        }
        (merged as Record<string, unknown>)[key] = combined;
      } else {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    merged.updatedAt = Date.now();
    state.profile = merged;
    return merged;
  });
}

// Overwrite the given profile fields exactly (arrays replaced, not appended;
// empty strings/arrays clear the field). Used by the Profile page's explicit
// edits, where merge/append semantics would make deletions impossible.
export async function setProfileFields(
  patch: Partial<Profile>,
): Promise<Profile> {
  return mutate((state) => {
    const next: Profile = { ...state.profile };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue; // undefined = "leave as-is"
      (next as Record<string, unknown>)[key] = value;
    }
    next.updatedAt = Date.now();
    state.profile = next;
    return next;
  });
}

export async function upsertMatches(matches: Match[]): Promise<void> {
  return mutate((state) => {
    for (const m of matches) {
      const idx = state.matches.findIndex(
        (x) => x.company.toLowerCase() === m.company.toLowerCase(),
      );
      if (idx >= 0) {
        state.matches[idx] = { ...state.matches[idx], ...m };
      } else {
        state.matches.push(m);
      }
    }
  });
}

export async function updateMatch(
  id: string,
  patch: Partial<Match>,
): Promise<Match | null> {
  return mutate((state) => {
    const idx = state.matches.findIndex((m) => m.id === id);
    if (idx < 0) return null;
    state.matches[idx] = {
      ...state.matches[idx],
      ...patch,
      updatedAt: Date.now(),
    };
    return state.matches[idx];
  });
}

// Resolve a match by id, exact company name, or a fuzzy contains match — the
// agent refers to companies by name in chat, so be forgiving.
export function findMatch(state: AppState, ref: string): Match | undefined {
  const needle = ref.trim().toLowerCase();
  return (
    state.matches.find((m) => m.id === ref) ??
    state.matches.find((m) => m.company.toLowerCase() === needle) ??
    state.matches.find((m) => m.company.toLowerCase().includes(needle))
  );
}
