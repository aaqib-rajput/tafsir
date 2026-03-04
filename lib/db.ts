import { promises as fs } from "fs";
import path from "path";

export type AttendanceStatus = "present" | "absent" | "unmarked";
export type Role = "participant" | "presenter" | "cohost" | "host";

export type MemberRecord = {
  id: string;
  name: string;
  role: Role;
  attendance: AttendanceStatus;
  speakLimit: number;
  elapsedTime: number;
  queueOrder: number;
  createdAt: string;
  updatedAt: string;
};

type SupabaseMemberRow = {
  id: string;
  name: string;
  role: Role;
  attendance: AttendanceStatus;
  speak_limit: number;
  elapsed_time: number;
  queue_order: number;
  created_at: string;
  updated_at: string;
};

type KvCredentials = {
  url: string;
  token: string;
};

const FILE_PATH = path.join(process.cwd(), ".data", "members.json");
const KV_KEY = "tafsir:members";
const DEFAULT_SPEAK_LIMIT = 120;

const TEAM_DATA = {
  "Team A": [
    "Nadeem",
    "Zoya",
    "Rohma Zil Arsh",
    "Sameen Zara",
    "Ahmad Adrees",
    "Mubashir Ali",
    "Ali Hanzala",
    "Ammara",
    "Noor Ayesha",
    "Masaud Khan",
    "Khushbakht Tausif Hashmi",
    "Wasif",
    "Romana Daim",
    "Ahsan Raza",
    "Amina Khan",
    "Wania",
    "Shahid Ameer Hamza",
    "Afsana Yaqoob",
    "Safa Shahid",
    "Dr. Rimsha",
  ],
  "Team B": [
    "Aqib",
    "Khadija",
    "Malaika Imran",
    "Hasnat Fatima",
    "Abdullah Shahbaz",
    "Rimsha Kousar",
    "Attaullah",
    "Sidra Sahir",
    "Maryam Iftikhar",
    "Saleha",
    "Huraima",
    "Sidra Bashir",
    "Usba",
    "Shaheer",
    "Zunaira Rashid",
    "Bilal",
    "Abdur Rehman Khan",
    "Abdullah Chaudhry",
    "Azhar Mehmood",
    "Tahira",
    "Nasseb Ullah",
    "Fiza Urooj",
    "Sadia Wajahat",
    "Muhammad Ibrahim",
    "Rabia Naqi",
    "Zamurrad",
  ],
  "Team C": [
    "Saboor",
    "Kamran",
    "Sidra Younas",
    "Ishrat Fatima",
    "Saddam Sharif",
    "Faiza",
    "Rehana",
    "Talha Mushtaq",
    "Azeem Aourangzaib",
    "Mrs Azeem Aourangzaib",
    "Muhammad Uzair Rashid",
    "Fahad Khan",
    "Arsalan G14",
    "Arsalan G07",
    "Majid Khan",
    "Abdullah Khan",
    "Kashif Noor",
    "Zain ul Abideen",
    "Farhan Afzal",
    "Amna Fazahil",
    "Bilal Shahid",
    "Hina Yousuf",
  ],
} as const;

const hasSupabase = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const getKvCredentials = (): KvCredentials | null => {
  const explicitPairs = [
    { urlKey: "KV_REST_API_URL", tokenKey: "KV_REST_API_TOKEN" },
    { urlKey: "UPSTASH_REDIS_REST_URL", tokenKey: "UPSTASH_REDIS_REST_TOKEN" },
    { urlKey: "KV_URL", tokenKey: "KV_TOKEN" },
  ];

  for (const pair of explicitPairs) {
    const url = process.env[pair.urlKey];
    const token = process.env[pair.tokenKey];
    if (url && token) {
      return { url, token };
    }
  }

  const keys = Object.keys(process.env);

  for (const key of keys) {
    if (!key.endsWith("_REST_API_URL")) continue;
    const prefix = key.slice(0, -"_REST_API_URL".length);
    const tokenKey = `${prefix}_REST_API_TOKEN`;
    const url = process.env[key];
    const token = process.env[tokenKey];
    if (url && token) {
      return { url, token };
    }
  }

  for (const key of keys) {
    if (!key.endsWith("_URL")) continue;
    const prefix = key.slice(0, -"_URL".length);
    const tokenKey = `${prefix}_TOKEN`;
    const url = process.env[key];
    const token = process.env[tokenKey];
    if (url && token) {
      return { url, token };
    }
  }

  return null;
};

const hasKv = () => Boolean(getKvCredentials());

const toRecord = (row: SupabaseMemberRow): MemberRecord => ({
  id: row.id,
  name: row.name,
  role: row.role,
  attendance: row.attendance,
  speakLimit: row.speak_limit,
  elapsedTime: row.elapsed_time,
  queueOrder: row.queue_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSupabaseRow = (member: MemberRecord): SupabaseMemberRow => ({
  id: member.id,
  name: member.name,
  role: member.role,
  attendance: member.attendance,
  speak_limit: member.speakLimit,
  elapsed_time: member.elapsedTime,
  queue_order: member.queueOrder,
  created_at: member.createdAt,
  updated_at: member.updatedAt,
});

const buildDefaultMembers = (): MemberRecord[] => {
  const names = Object.values(TEAM_DATA).flat();
  const uniqueNames = names.filter(
    (name, index) =>
      names.findIndex((n) => n.toLowerCase() === name.toLowerCase()) === index,
  );
  const now = new Date().toISOString();

  return uniqueNames.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    role: "participant",
    attendance: "unmarked",
    speakLimit: DEFAULT_SPEAK_LIMIT,
    elapsedTime: 0,
    queueOrder: index + 1,
    createdAt: now,
    updatedAt: now,
  }));
};

const supabaseRequest = async <T>(
  endpoint: string,
  init: RequestInit = {},
): Promise<T> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase config missing");

  const response = await fetch(`${url}/rest/v1/${endpoint}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const kvRequest = async (command: string, ...args: string[]) => {
  const credentials = getKvCredentials();
  if (!credentials) throw new Error("KV config missing");

  const response = await fetch(
    `${credentials.url}/${command}/${args.map(encodeURIComponent).join("/")}`,
    {
      headers: { Authorization: `Bearer ${credentials.token}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`KV request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as { result: unknown };
};

const readFromFile = async (): Promise<MemberRecord[]> => {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as MemberRecord[];
    return parsed.sort((a, b) => a.queueOrder - b.queueOrder);
  } catch {
    return [];
  }
};

const writeToFile = async (members: MemberRecord[]) => {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(members, null, 2), "utf-8");
};

export const getMembers = async (): Promise<MemberRecord[]> => {
  if (hasSupabase()) {
    const rows = await supabaseRequest<SupabaseMemberRow[]>(
      "members?select=*&order=queue_order.asc",
    );
    return rows.map(toRecord);
  }

  if (hasKv()) {
    const payload = await kvRequest("get", KV_KEY);
    const result = payload.result;
    const members =
      typeof result === "string"
        ? ((JSON.parse(result) as MemberRecord[]) ?? [])
        : ((result as MemberRecord[] | null) ?? []);
    return [...members].sort((a, b) => a.queueOrder - b.queueOrder);
  }

  return readFromFile();
};

export const seedDefaultMembers = async (force = false) => {
  const existing = await getMembers();
  if (!force && existing.length > 0) {
    return { seeded: false, members: existing };
  }

  const defaults = buildDefaultMembers();
  await replaceMembers(defaults);
  return { seeded: true, members: defaults };
};

export const createMember = async (name: string): Promise<MemberRecord> => {
  const members = await getMembers();
  const safeName = name.trim();
  if (!safeName) throw new Error("Name is required");

  const now = new Date().toISOString();
  const member: MemberRecord = {
    id: crypto.randomUUID(),
    name: safeName,
    role: "participant",
    attendance: "unmarked",
    speakLimit: DEFAULT_SPEAK_LIMIT,
    elapsedTime: 0,
    queueOrder: members.length + 1,
    createdAt: now,
    updatedAt: now,
  };

  const next = [...members, member];
  await replaceMembers(next);
  return member;
};

export const deleteMember = async (id: string) => {
  const members = await getMembers();
  const next = members
    .filter((member) => member.id !== id)
    .map((member, index) => ({
      ...member,
      queueOrder: index + 1,
      updatedAt: new Date().toISOString(),
    }));
  await replaceMembers(next);
};

export const replaceMembers = async (members: MemberRecord[]) => {
  const normalized = members.map((member, index) => ({
    ...member,
    queueOrder: index + 1,
    updatedAt: new Date().toISOString(),
    createdAt: member.createdAt ?? new Date().toISOString(),
  }));

  if (hasSupabase()) {
    await supabaseRequest("members?id=not.is.null", { method: "DELETE" });
    if (normalized.length > 0) {
      await supabaseRequest("members", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(normalized.map(toSupabaseRow)),
      });
    }
    return;
  }

  if (hasKv()) {
    await kvRequest("set", KV_KEY, JSON.stringify(normalized));
    return;
  }

  await writeToFile(normalized);
};
