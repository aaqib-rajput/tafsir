"use client";

import { useEffect, useMemo, useState } from "react";

type AttendanceStatus = "present" | "absent" | "unmarked";
type Role = "participant" | "presenter" | "cohost" | "host";

type Member = {
  id: string;
  name: string;
  role: Role;
  attendance: AttendanceStatus;
  speakLimit: number;
  elapsedTime: number;
  queueOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

const ROLE_LIMITS: Record<Role, number> = {
  participant: 120,
  presenter: 180,
  cohost: 300,
  host: 600,
};

const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export default function HomePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [sessionRemaining, setSessionRemaining] = useState(0);
  const [sessionRunning, setSessionRunning] = useState(false);

  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [speakerRemaining, setSpeakerRemaining] = useState(0);
  const [speakerRunning, setSpeakerRunning] = useState(false);
  const [speakerRole, setSpeakerRole] = useState<Role>("participant");
  const [speakerMinutes, setSpeakerMinutes] = useState(2);
  const [dragMemberId, setDragMemberId] = useState<string | null>(null);

  const filteredMembers = useMemo(
    () =>
      members.filter((member) =>
        member.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [members, search],
  );

  const currentSpeaker = useMemo(
    () => members.find((member) => member.id === currentSpeakerId) ?? null,
    [members, currentSpeakerId],
  );

  const stats = useMemo(() => {
    const present = members.filter((m) => m.attendance === "present").length;
    const absent = members.filter((m) => m.attendance === "absent").length;
    return { total: members.length, present, absent };
  }, [members]);

  const syncMembers = async (next: Member[]) => {
    setMembers(next);
    await fetch("/api/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ members: next }),
    });
  };

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/members", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load members");
      const data = (await response.json()) as { members: Member[] };
      const sorted = [...data.members].sort((a, b) => a.queueOrder - b.queueOrder);
      setMembers(sorted);
    } catch (e) {
      setError("Unable to load data. Please try again.");
      console.error(e);
    } finally {
      setHasLoadedInitialData(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, []);

  useEffect(() => {
    if (!sessionRunning) return;
    const timer = window.setInterval(() => {
      setSessionRemaining((prev) => {
        if (prev <= 1) {
          setSessionRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionRunning]);

  useEffect(() => {
    if (!speakerRunning || !currentSpeakerId) return;
    const timer = window.setInterval(() => {
      setSpeakerRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        setMembers((old) =>
          old.map((member) =>
            member.id === currentSpeakerId
              ? { ...member, elapsedTime: member.elapsedTime + 1 }
              : member,
          ),
        );
        if (next === 0) {
          setSpeakerRunning(false);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [speakerRunning, currentSpeakerId]);

  useEffect(() => {
    if (!hasLoadedInitialData) return;
    const timeout = window.setTimeout(() => {
      void fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members }),
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedInitialData, members]);

  const addMember = async () => {
    const safeName = newName.trim();
    if (!safeName || safeName.toLowerCase() === "none") return;
    const response = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: safeName }),
    });
    if (response.ok) {
      const data = (await response.json()) as { member: Member };
      setMembers((prev) => [...prev, data.member]);
      setNewName("");
    }
  };

  const updateMember = async (id: string, patch: Partial<Member>) => {
    const next = members.map((member) =>
      member.id === id ? { ...member, ...patch } : member,
    );
    await syncMembers(next);
  };

  const removeMember = async (id: string) => {
    await fetch(`/api/members?id=${id}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((member) => member.id !== id));
    if (currentSpeakerId === id) {
      setCurrentSpeakerId(null);
      setSpeakerRunning(false);
      setSpeakerRemaining(0);
    }
  };

  const reorderMembers = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const next = [...members];
    const sourceIndex = next.findIndex((m) => m.id === sourceId);
    const targetIndex = next.findIndex((m) => m.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    const normalized = next.map((member, index) => ({ ...member, queueOrder: index + 1 }));
    await syncMembers(normalized);
  };

  const selectSpeaker = (member: Member) => {
    setCurrentSpeakerId(member.id);
    setSpeakerRunning(false);
    setSpeakerRole(member.role);
    setSpeakerMinutes(Math.round(member.speakLimit / 60));
    setSpeakerRemaining(Math.max(0, member.speakLimit - member.elapsedTime));
  };

  const applySpeakerConfig = async () => {
    if (!currentSpeaker) return;
    const limit = Math.max(1, speakerMinutes) * 60;
    await updateMember(currentSpeaker.id, { role: speakerRole, speakLimit: limit });
    setSpeakerRemaining(Math.max(0, limit - currentSpeaker.elapsedTime));
  };

  const downloadCsv = () => {
    const rows = members
      .filter((member) => member.name.trim() && member.name.toLowerCase() !== "none")
      .map((member) => ({
        Name: member.name,
        Attendance: member.attendance,
        Role: member.role,
        UsedTime: formatTime(member.elapsedTime),
        Limit: formatTime(member.speakLimit),
      }));

    const csv = [
      Object.keys(rows[0] ?? { Name: "", Attendance: "", Role: "", UsedTime: "", Limit: "" }).join(","),
      ...rows.map((r) => Object.values(r).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tafsir-session-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="container">
      <header className="titleRow">
        <h1>Tafsir Session Manager</h1>
        <p>Vercel-ready full-stack app with persistent members and smart speaker flow.</p>
      </header>

      {error && <p className="errorText">{error}</p>}

      <section className="grid">
        <article className="card">
          <h2>Attendance</h2>
          <div className="stats">
            <span>Total: {stats.total}</span>
            <span>Present: {stats.present}</span>
            <span>Absent: {stats.absent}</span>
          </div>
          <div className="inline">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addMember()}
              placeholder="Member name"
            />
            <button className="primary" onClick={() => void addMember()}>
              Add
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members"
          />
          <p className="helpText">Drag members to reorder queue or drop on speaker window.</p>
          <ul className="list">
            {loading ? (
              <li className="listItem">Loading...</li>
            ) : (
              filteredMembers.map((member) => (
                <li
                  key={member.id}
                  className={`listItem ${member.attendance}`}
                  draggable
                  onDragStart={() => setDragMemberId(member.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dragMemberId && void reorderMembers(dragMemberId, member.id)}
                >
                  <div>
                    <strong>{member.name}</strong>
                    <p>
                      {formatTime(member.elapsedTime)} / {formatTime(member.speakLimit)}
                    </p>
                  </div>
                  <div className="actions">
                    <button onClick={() => void updateMember(member.id, { attendance: "present" })}>Present</button>
                    <button
                      className="accent"
                      onClick={() => selectSpeaker(member)}
                    >
                      Speak
                    </button>
                    <button onClick={() => void updateMember(member.id, { attendance: "absent" })}>Absent</button>
                    <button className="danger" onClick={() => void removeMember(member.id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </article>

        <article
          className="card speaker"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (!dragMemberId) return;
            const member = members.find((m) => m.id === dragMemberId);
            if (member) selectSpeaker(member);
          }}
        >
          <h2>Speaker Window</h2>
          <p className="muted">
            {currentSpeaker ? `Current: ${currentSpeaker.name}` : "No speaker selected"}
          </p>
          <p className="timer">{formatTime(currentSpeaker ? speakerRemaining : 0)}</p>
          <p className="muted">
            Elapsed: {formatTime(currentSpeaker?.elapsedTime ?? 0)} · Limit: {formatTime(currentSpeaker?.speakLimit ?? 120)}
          </p>

          <div className="speakerConfig">
            <select
              value={speakerRole}
              onChange={(e) => setSpeakerRole(e.target.value as Role)}
              disabled={!currentSpeaker}
            >
              <option value="participant">Participant ({ROLE_LIMITS.participant / 60}m)</option>
              <option value="presenter">Presenter ({ROLE_LIMITS.presenter / 60}m)</option>
              <option value="cohost">Co-host ({ROLE_LIMITS.cohost / 60}m)</option>
              <option value="host">Host ({ROLE_LIMITS.host / 60}m)</option>
            </select>
            <input
              type="number"
              min={1}
              value={speakerMinutes}
              onChange={(e) => setSpeakerMinutes(Number(e.target.value) || 1)}
              disabled={!currentSpeaker}
            />
            <button className="primary" onClick={() => void applySpeakerConfig()} disabled={!currentSpeaker}>
              Update
            </button>
          </div>

          <div className="inline">
            <button className="primary" onClick={() => setSpeakerRunning(true)} disabled={!currentSpeaker}>
              Start
            </button>
            <button onClick={() => setSpeakerRunning(false)} disabled={!currentSpeaker}>
              Pause
            </button>
            <button
              onClick={() => {
                if (!currentSpeaker) return;
                void updateMember(currentSpeaker.id, { elapsedTime: 0 });
                setSpeakerRunning(false);
                setSpeakerRemaining(currentSpeaker.speakLimit);
              }}
              disabled={!currentSpeaker}
            >
              Reset
            </button>
          </div>
        </article>

        <article className="card">
          <h2>Session Timer</h2>
          <div className="inline">
            <input
              type="number"
              min={1}
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Number(e.target.value) || 1)}
            />
            <button
              className="primary"
              onClick={() => {
                setSessionRemaining(sessionMinutes * 60);
                setSessionRunning(true);
              }}
            >
              Start Session
            </button>
          </div>
          <p className="timer">{formatTime(sessionRemaining)}</p>
          <div className="inline">
            <button onClick={() => setSessionRunning(false)}>Pause</button>
            <button
              onClick={() => {
                setSessionRunning(false);
                setSessionRemaining(0);
              }}
            >
              Reset
            </button>
          </div>
        </article>

        <article className="card">
          <h2>Summary & Export</h2>
          <button className="primary" onClick={downloadCsv}>
            Download CSV
          </button>
          <ul className="list compact">
            {members.map((member) => (
              <li key={member.id} className="listItem">
                <span>{member.name}</span>
                <span>{formatTime(member.elapsedTime)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
