# NanoClaw Spesenbot – PoC Plan

## Context

### Ausgangslage
- **Ziel**: 1000 Mitarbeiter bekommen einen AI-Assistenten via MS Teams (Spesen, IT-Tickets, Admin)
- **Plattform**: NanoClaw (open-source, MIT, Container-Isolation pro User)
- **Warum NanoClaw statt Microsoft-Bordmittel**: Kein Vendor Lock-in, transparente Komplexität, Multi-Channel-Fähigkeit, OS-Level-Isolation, volle Kontrolle
- **Warum NanoClaw statt LangGraph/CrewAI**: Fertiges Produkt (nicht nur Framework), Multi-Tenancy eingebaut, Container-Isolation eingebaut, weniger "Plumbing Code"
- **Zukunftsperspektive**: A2A-Protocol für Agent-zu-Agent-Kommunikation (SAP Joule, ServiceNow, etc.) – v1.0 seit 12. März 2026

### Was bereits existiert

**NanoClaw Framework** (`/Users/henry/nanoclaw-sandbox-9740/`):
- Vollständiges Messaging-Framework mit Container-Isolation
- WhatsApp-Channel als Referenz-Implementierung (~450 Zeilen)
- Channel-Registry mit Self-Registration Pattern
- Credential Proxy, Group Queue, Scheduled Tasks
- 23 Claude Code Skills
- ~10K+ LOC TypeScript

**Spesenbot-Prototyp** (`/Users/henry/nanoclaw-spesenbot/`):
- Standalone CLI-Tool (NICHT NanoClaw-Fork)
- 3 Dateien, ~250 LOC
- SQLite DB mit `spesen`-Tabelle (betrag, waehrung, datum, kategorie, beschreibung, beleg)
- AI-Parsing via Kimi K2.5 (OpenAI SDK) – muss auf Claude umgestellt werden
- `@anthropic-ai/sdk` ist bereits als Dependency installiert, aber nicht genutzt
- Kein Git-Repo, kein Teams, keine Channels

---

## Architektur-Entscheid

### Ansatz: NanoClaw-Fork + Teams-Channel + Spesen-Skill

```
MS Teams ──webhook──► NanoClaw (Fork) ──container──► Claude Agent
                          │                              │
                          │ SQLite (Messages,             │ CLAUDE.md
                          │ Groups, Spesen)               │ (Spesen-Instruktionen)
                          │                              │
                          │ Credential Proxy              │ MCP Server
                          │ (API Keys nie im Container)   │ (ERP/Spesen-API)
                          │                              │
                          └──────────────────────────────┘
```

**Nicht**: Spesenbot-Standalone erweitern (zu viel nachbauen was NanoClaw schon hat)
**Sondern**: NanoClaw forken, Teams-Channel hinzufügen, Spesen-Logik als CLAUDE.md Skill

---

## PoC-Scope (Minimal Viable)

### Was der PoC kann:
1. Mitarbeiter schreibt dem Bot in Teams: "Mittagessen 45 CHF gestern"
2. Bot parsed die Nachricht, fragt nach fehlenden Infos (Kategorie? Beleg?)
3. Bot speichert Spese in SQLite
4. Mitarbeiter kann fragen: "Was hab ich diesen Monat ausgegeben?"
5. Bot antwortet mit Zusammenfassung

### Was der PoC NICHT kann (kommt später):
- Beleg-Fotos (Vision)
- ERP-Integration (A2A/MCP)
- Multi-User (nur 1 Testuser)
- Adaptive Cards (erstmal nur Text)
- Export CSV/Excel

---

## Implementierungsplan

### Phase 1: NanoClaw-Fork vorbereiten

**Aufgabe**: NanoClaw-Repo forken, unnötige Channels entfernen, Basis aufsetzen.

**Dateien**:
- Fork von `/Users/henry/nanoclaw-sandbox-9740/`
- Bestehende Channels (WhatsApp) vorerst deaktivieren in `src/channels/index.ts`
- Spesen-DB-Schema aus `/Users/henry/nanoclaw-spesenbot/src/db.ts` übernehmen

---

### Phase 2: MS Teams Channel bauen

**Aufgabe**: `src/channels/teams.ts` implementieren nach dem Muster von `whatsapp.ts`.

**Referenz-Interface** (aus `src/types.ts`):
```typescript
interface Channel {
  name: string;
  connect(): Promise<void>;
  sendMessage(jid: string, text: string): Promise<void>;
  isConnected(): boolean;
  ownsJid(jid: string): boolean;
  disconnect(): Promise<void>;
  setTyping?(jid: string, isTyping: boolean): Promise<void>;
}
```

**Neue Dateien**:
- `src/channels/teams.ts` – TeamsChannel Klasse
- `src/channels/index.ts` – Import hinzufügen

**Dependencies**:
- `botbuilder` (Microsoft Bot Framework SDK v4)
- `botframework-connector` (für Proactive Messaging)

**Kernlogik**:
1. Express-Server für `/api/messages` Webhook
2. Bot Framework Adapter empfängt Activities
3. `onMessage()` Callback → schreibt in SQLite (wie WhatsApp-Channel)
4. `sendMessage()` → Proactive Messaging via gespeicherte `conversationReference`
5. JID-Format: `teams:{conversation_id}`
6. Self-Registration: `registerChannel('teams', factory)`

**Azure-Setup** (einmalig, manuell):
- Azure Bot Registration erstellen
- App ID + App Password in `.env`
- Teams App Manifest (JSON) mit Bot-Endpoint
- Sideloading in Teams Admin Center aktivieren

---

### Phase 3: Spesen-CLAUDE.md schreiben

**Aufgabe**: Agent-Instruktionen für Spesenverwaltung als CLAUDE.md.

**Datei**: `groups/global/CLAUDE.md` (gilt für alle Gruppen)

**Inhalt** (Entwurf):
```markdown
# Spesenbot

Du bist ein Spesen-Assistent für Mitarbeiter.

## Fähigkeiten
- Spesen erfassen aus natürlicher Sprache
- Fehlende Infos nachfragen (Datum, Kategorie, Betrag)
- Zusammenfassungen erstellen (Tag, Woche, Monat)
- Kategorien: Verpflegung, Reise, Unterkunft, Material, Sonstiges

## Verhalten
- Antworte kurz und direkt
- Bestätige jede erfasste Spese mit den Details
- Bei unklaren Beträgen: nachfragen
- Währung: CHF als Default, andere akzeptieren
- Sprache: Deutsch

## Datenformat
Speichere Spesen als JSON:
{betrag, waehrung, datum, kategorie, beschreibung}
```

**Plus**: MCP-Server oder Bash-Tool für SQLite-Zugriff (Spesen lesen/schreiben)

---

### Phase 4: Spesen-Tool als MCP-Server

**Aufgabe**: Claude braucht ein Tool um Spesen in SQLite zu lesen/schreiben.

**Option A**: Bash-Tool (einfacher für PoC)
- Claude hat bereits Bash-Zugriff im Container
- SQLite CLI im Container verfügbar
- CLAUDE.md instruiert Claude, `sqlite3` Befehle zu nutzen

**Option B**: MCP-Server (sauberer)
- `src/mcp/spesen-server.ts`
- Tools: `add_expense`, `list_expenses`, `get_summary`
- Mounted als MCP-Server in Container-Config

**Empfehlung für PoC**: Option A (Bash). Schneller, weniger Code, gleiche Funktionalität.

---

### Phase 5: Integration & Test

**Aufgabe**: Alles zusammenstecken und testen.

1. NanoClaw starten mit Teams-Channel
2. In Teams den Bot anschreiben
3. "Mittagessen 32.50 CHF" → Bot erstellt Spese
4. "Was hab ich diese Woche ausgegeben?" → Bot zeigt Summary
5. Verschiedene Eingabeformate testen (Deutsch, mit/ohne Datum, verschiedene Kategorien)

---

## Kosten für den PoC

| Komponente | Kosten |
|------------|--------|
| NanoClaw | $0 (MIT) |
| Azure Bot Registration | $0 (Free Tier) |
| Claude API (Testing) | ~$5-10 |
| Hosting (lokal für PoC) | $0 |
| **Total** | **~$5-10** |

---

## Kritische Dateien

| Datei | Zweck | Aktion |
|-------|-------|--------|
| `nanoclaw-sandbox-9740/src/channels/whatsapp.ts` | Referenz für Teams-Channel | Lesen |
| `nanoclaw-sandbox-9740/src/channels/registry.ts` | Channel-Registration | Lesen |
| `nanoclaw-sandbox-9740/src/types.ts` | Channel Interface | Lesen |
| `nanoclaw-sandbox-9740/src/index.ts` | Orchestrator | Minimal anpassen |
| `nanoclaw-sandbox-9740/src/db.ts` | DB Schema | Spesen-Tabelle hinzufügen |
| `nanoclaw-spesenbot/src/db.ts` | Spesen-Schema Referenz | Übernehmen |
| `nanoclaw-spesenbot/src/ai.ts` | Parsing-Logik Referenz | Pattern übernehmen |
| **Neu**: `src/channels/teams.ts` | Teams Channel | Bauen |
| **Neu**: `groups/global/CLAUDE.md` | Spesen-Instruktionen | Schreiben |

---

## Risiken & Offene Fragen

| Risiko | Mitigation |
|--------|-----------|
| Teams Webhook braucht öffentliche URL | ngrok/Cloudflare Tunnel für PoC |
| Azure Bot Registration ist umständlich | Schritt-für-Schritt-Anleitung vorbereiten |
| Claude im Container braucht SQLite-Zugriff | DB-Datei als Volume mounten |
| NanoClaw-Fork divergiert vom Upstream | Minimale Änderungen, NanoClaw-Skill-System nutzen |

## Verifikation

1. `npm start` → NanoClaw startet ohne Fehler, Teams-Channel verbindet
2. Teams-Nachricht "Hallo" → Bot antwortet
3. "Mittagessen 45 CHF gestern" → Bot bestätigt Spese mit Details
4. "Zusammenfassung März" → Bot zeigt Monats-Summary
5. SQLite enthält korrekte Einträge in `spesen`-Tabelle

---

## Zeithorizont

| Phase | Aufwand |
|-------|---------|
| 1: Fork vorbereiten | 2-3 Stunden |
| 2: Teams Channel | 1-2 Tage |
| 3: CLAUDE.md | 1-2 Stunden |
| 4: Spesen-Tool | 2-4 Stunden |
| 5: Integration & Test | 1 Tag |
| **Total** | **~3-4 Tage** |
