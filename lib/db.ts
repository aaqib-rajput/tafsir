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

const FILE_PATH = path.join(process.cwd(), ".data", "members.json");
const KV_KEY = "tafsir:members";

const hasSupabase = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const hasKv = () =>
  Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

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
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("KV config missing");

  const response = await fetch(`${url}/${command}/${args.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

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
    speakLimit: 120,
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
