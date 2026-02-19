"use client";

import { useEffect, useMemo, useState } from "react";

type AttendanceStatus = "present" | "absent" | "unmarked";
type Role = "participant" | "presenter" | "cohost" | "host";
type TeamKey = "ALL" | "Team A" | "Team B" | "Team C";

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

const DEFAULT_ROLE_LIMITS: Record<Role, number> = {
  participant: 120,
  presenter: 180,
  cohost: 300,
  host: 600,
};

const TEAM_DATA: Record<Exclude<TeamKey, "ALL">, string[]> = {
  "Team A": [
    "Nadeem", "Zoya", "Rohma Zil Arsh", "Sameen Zara", "Ahmad Adrees", "Mubashir Ali", "Ali Hanzala", "Ammara", "Noor Ayesha", "Masaud Khan", "Khushbakht Tausif Hashmi", "Wasif", "Romana Daim", "Ahsan Raza", "Amina Khan", "Wania", "Shahid Ameer Hamza", "Afsana Yaqoob", "Safa Shahid", "Dr. Rimsha",
  ],
  "Team B": [
    "Aqib", "Khadija", "Malaika Imran", "Hasnat Fatima", "Abdullah Shahbaz", "Rimsha Kousar", "Attaullah", "Sidra Sahir", "Maryam Iftikhar", "Saleha", "Huraima", "Sidra Bashir", "Usba", "Shaheer", "Zunaira Rashid", "Bilal", "Abdur Rehman Khan", "Abdullah Chaudhry", "Azhar Mehmood", "Tahira", "Nasseb Ullah", "Fiza Urooj", "Sadia Wajahat", "Muhammad Ibrahim", "Rabia Naqi", "Zamurrad",
  ],
  "Team C": [
    "Saboor", "Kamran", "Sidra Younas", "Ishrat Fatima", "Saddam Sharif", "Faiza", "Rehana", "Talha Mushtaq", "Azeem Aourangzaib", "Mrs Azeem Aourangzaib", "Muhammad Uzair Rashid", "Fahad Khan", "Arsalan G14", "Arsalan G07", "Majid Khan", "Abdullah Khan", "Kashif Noor", "Zain ul Abideen", "Farhan Afzal", "Amna Fazahil", "Bilal Shahid", "Hina Yousuf",
  ],
};

const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const uniqueNames = (names: string[]) =>
  names.filter((name, index) => names.findIndex((n) => n.toLowerCase() === name.toLowerCase()) === index);

export default function HomePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [sessionInitial, setSessionInitial] = useState(45 * 60);
  const [sessionRemaining, setSessionRemaining] = useState(0);
  const [sessionRunning, setSessionRunning] = useState(false);

  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [speakerRemaining, setSpeakerRemaining] = useState(0);
  const [speakerRunning, setSpeakerRunning] = useState(false);
  const [speakerRole, setSpeakerRole] = useState<Role>("participant");
  const [speakerMinutes, setSpeakerMinutes] = useState(2);
  const [speakerQueue, setSpeakerQueue] = useState<string[]>([]);
  const [roleLimits, setRoleLimits] = useState<Record<Role, number>>(DEFAULT_ROLE_LIMITS);
  const [teamSelection, setTeamSelection] = useState<TeamKey>("ALL");
  const [dragMemberId, setDragMemberId] = useState<string | null>(null);

  const filteredMembers = useMemo(
    () => members.filter((member) => member.name.toLowerCase().includes(query.trim().toLowerCase())),
    [members, query],
  );

  const currentSpeaker = useMemo(
    () => members.find((member) => member.id === currentSpeakerId) ?? null,
    [members, currentSpeakerId],
  );

  useEffect(() => {
    if (currentSpeaker) {
      setSpeakerRole(currentSpeaker.role);
      setSpeakerMinutes(Math.max(1, Math.round(currentSpeaker.speakLimit / 60)));
      return;
    }

    setSpeakerMinutes(Math.max(1, Math.round(roleLimits[speakerRole] / 60)));
  }, [currentSpeaker, roleLimits, speakerRole]);

  const queueMembers = useMemo(
    () => speakerQueue.map((id) => members.find((m) => m.id === id)).filter((m): m is Member => Boolean(m)),
    [speakerQueue, members],
  );

  const stats = useMemo(() => {
    const present = members.filter((m) => m.attendance === "present").length;
    const absent = members.filter((m) => m.attendance === "absent").length;
    return { total: members.length, present, absent };
  }, [members]);

  const speakerProgress = useMemo(() => {
    const limit = currentSpeaker?.speakLimit ?? 120;
    if (!limit) return 0;
    return Math.min(100, Math.max(0, ((limit - speakerRemaining) / limit) * 100));
  }, [currentSpeaker, speakerRemaining]);

  const sessionProgress = useMemo(() => {
    if (!sessionInitial) return 0;
    return Math.min(100, Math.max(0, ((sessionInitial - sessionRemaining) / sessionInitial) * 100));
  }, [sessionInitial, sessionRemaining]);

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

  const makeTeamMembers = (team: TeamKey): Member[] => {
    const rawNames = team === "ALL" ? Object.values(TEAM_DATA).flat() : TEAM_DATA[team];
    const names = uniqueNames(rawNames);
    const now = new Date().toISOString();

    return names.map((name, index) => ({
      id: crypto.randomUUID(),
      name,
      attendance: "unmarked",
      elapsedTime: 0,
      role: "participant",
      speakLimit: roleLimits.participant,
      queueOrder: index + 1,
      createdAt: now,
      updatedAt: now,
    }));
  };

  const loadSelectedTeam = async () => {
    const next = makeTeamMembers(teamSelection);
    setSpeakerQueue([]);
    setCurrentSpeakerId(null);
    setSpeakerRunning(false);
    setSpeakerRemaining(0);
    await syncMembers(next);
  };

  const resetSessionState = async () => {
    setSessionRunning(false);
    setSessionRemaining(0);
    setSessionInitial(sessionMinutes * 60);
    setSpeakerRunning(false);
    setSpeakerQueue([]);
    setCurrentSpeakerId(null);
    setSpeakerRemaining(0);

    const response = await fetch("/api/members", { cache: "no-store" });
    if (!response.ok) {
      setError("Unable to reset session from database.");
      return;
    }

    const data = (await response.json()) as { members: Member[] };
    const reloaded = [...data.members]
      .sort((a, b) => a.queueOrder - b.queueOrder)
      .map((member, index) => ({
        ...member,
        attendance: "unmarked" as AttendanceStatus,
        elapsedTime: 0,
        queueOrder: index + 1,
      }));

    await syncMembers(reloaded);
  };

  const handleSearchOrAdd = async () => {
    const value = query.trim();
    if (!value || value.toLowerCase() === "none") return;

    const exists = members.some((m) => m.name.toLowerCase() === value.toLowerCase());
    if (exists) {
      return;
    }

    const response = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
    });

    if (response.ok) {
      const data = (await response.json()) as { member: Member };
      setMembers((prev) => [...prev, data.member]);
    }
  };

  const updateMember = async (id: string, patch: Partial<Member>) => {
    const next = members.map((member) => (member.id === id ? { ...member, ...patch } : member));
    await syncMembers(next);
  };

  const removeMember = async (id: string) => {
    await fetch(`/api/members?id=${id}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((member) => member.id !== id));
    setSpeakerQueue((prev) => prev.filter((queuedId) => queuedId !== id));

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

  const moveToNextSpeaker = () => {
    if (speakerQueue.length === 0) return;
    const nextId = speakerQueue[0];
    const nextMember = members.find((member) => member.id === nextId);
    setSpeakerQueue((prev) => prev.slice(1));
    if (nextMember) {
      selectSpeaker(nextMember);
    }
  };

  const toggleQueue = (memberId: string) => {
    setSpeakerQueue((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  const handleSpeakerRoleChange = (role: Role) => {
    setSpeakerRole(role);

    if (currentSpeaker && currentSpeaker.role === role) {
      setSpeakerMinutes(Math.max(1, Math.round(currentSpeaker.speakLimit / 60)));
      return;
    }

    setSpeakerMinutes(Math.max(1, Math.round(roleLimits[role] / 60)));
  };

  const applySpeakerConfig = async () => {
    const limit = Math.max(1, speakerMinutes) * 60;

    if (currentSpeaker) {
      const nextMembers = members.map((member) =>
        member.id === currentSpeaker.id
          ? { ...member, role: speakerRole, speakLimit: limit }
          : member,
      );
      await syncMembers(nextMembers);
      setSpeakerRemaining(Math.max(0, limit - currentSpeaker.elapsedTime));
      return;
    }

    setRoleLimits((prev) => ({ ...prev, [speakerRole]: limit }));

    const nextMembers = members.map((member) =>
      member.role === speakerRole ? { ...member, speakLimit: limit } : member,
    );
    await syncMembers(nextMembers);
  };

  const startSession = () => {
    const initial = sessionMinutes * 60;
    setSessionInitial(initial);
    setSessionRemaining(initial);
    setSessionRunning(true);
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
      ...rows.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tafsir-session-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="container">
      {error && <p className="errorText">{error}</p>}

      <section className="grid">
        <article className="card compactCard">
          <h2>Session Timer</h2>
          <div className="inline">
            <input
              type="number"
              min={1}
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Number(e.target.value) || 1)}
            />
            <button className="primary" onClick={startSession}>Start Session</button>
          </div>
          <p className="timer">{formatTime(sessionRemaining)}</p>
          <div className="progressTrack">
            <div className="progressFill session" style={{ width: `${sessionProgress}%` }} />
          </div>
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

        <article className="card compactCard">
          <h2>Summary & Export</h2>
          <button className="primary" onClick={downloadCsv}>Download CSV</button>
          <ul className="list compact">
            {members.map((member) => (
              <li key={member.id} className="listItem">
                <span>{member.name}</span>
                <span>{formatTime(member.elapsedTime)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="card attendanceCard">
          <h2>Attendance</h2>
          <div className="stats">
            <span>Total: {stats.total}</span>
            <span>Present: {stats.present}</span>
            <span>Absent: {stats.absent}</span>
          </div>

          <div className="inline">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSearchOrAdd()}
              placeholder="Search member or add if not found"
            />
            <button className="primary" onClick={() => void handleSearchOrAdd()}>Search / Add</button>
          </div>

          <div className="inline">
            <select value={teamSelection} onChange={(e) => setTeamSelection(e.target.value as TeamKey)}>
              <option value="ALL">ALL Teams</option>
              <option value="Team A">Team A</option>
              <option value="Team B">Team B</option>
              <option value="Team C">Team C</option>
            </select>
            <button onClick={() => void loadSelectedTeam()}>Load Team</button>
            <button className="danger" onClick={() => void resetSessionState()}>Reset Session</button>
          </div>

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
                  <div className="memberMeta">
                    <strong>{member.name}</strong>
                    <p>{formatTime(member.elapsedTime)} / {formatTime(member.speakLimit)}</p>
                  </div>
                  <div className="actions">
                    <button onClick={() => void updateMember(member.id, { attendance: "present" })}>Present</button>
                    <button className="accent" onClick={() => selectSpeaker(member)}>Speak</button>
                    <button onClick={() => toggleQueue(member.id)}>{speakerQueue.includes(member.id) ? "Unqueue" : "Queue"}</button>
                    <button onClick={() => void updateMember(member.id, { attendance: "absent" })}>Absent</button>
                    <button className="danger" onClick={() => void removeMember(member.id)}>Remove</button>
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
          <p className="muted">{currentSpeaker ? `Current: ${currentSpeaker.name}` : "No speaker selected"}</p>
          <p className="timer">{formatTime(currentSpeaker ? speakerRemaining : 0)}</p>
          <div className="progressTrack">
            <div className="progressFill" style={{ width: `${speakerProgress}%` }} />
          </div>
          <p className="muted">Elapsed: {formatTime(currentSpeaker?.elapsedTime ?? 0)} · Limit: {formatTime(currentSpeaker?.speakLimit ?? 120)}</p>

          <div className="speakerConfig">
            <select value={speakerRole} onChange={(e) => handleSpeakerRoleChange(e.target.value as Role)}>
              <option value="participant">Participant ({roleLimits.participant / 60}m)</option>
              <option value="presenter">Presenter ({roleLimits.presenter / 60}m)</option>
              <option value="cohost">Co-host ({roleLimits.cohost / 60}m)</option>
              <option value="host">Host ({roleLimits.host / 60}m)</option>
            </select>
            <input
              type="number"
              min={1}
              value={speakerMinutes}
              onChange={(e) => setSpeakerMinutes(Number(e.target.value) || 1)}
            />
            <button className="primary" onClick={() => void applySpeakerConfig()}>Update</button>
          </div>

          <div className="inline">
            <button className="primary" onClick={() => setSpeakerRunning(true)} disabled={!currentSpeaker}>Start</button>
            <button onClick={() => setSpeakerRunning(false)} disabled={!currentSpeaker}>Pause</button>
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
            <button onClick={moveToNextSpeaker} disabled={speakerQueue.length === 0}>Next in Queue</button>
          </div>

          <div>
            <p className="muted">Queue ({queueMembers.length})</p>
            <div className="queueWrap">
              {queueMembers.length === 0 ? <span className="helpText">No one in queue</span> : queueMembers.map((member) => (
                <span className="queueChip" key={member.id}>{member.name}</span>
              ))}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
