import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { emptyData, loadData, parseBackup, saveData } from '../src/domain/storage.ts';
import { demoSessions } from '../src/domain/demo.ts';
import { makeSession } from './helpers.ts';

describe('local persistence and backup boundaries', () => {
  it('creates no personal measurements or sessions by default', () => {
    const data = emptyData(); expect(data.sessions).toEqual([]); expect(data.profile.weight).toBeNull(); expect(data.profile.height).toBeNull(); expect(data.profile.clearance).toBe('unknown');
  });
  it('round-trips personal records through IndexedDB and JSON', async () => {
    const data = { ...emptyData(), sessions: [makeSession()], nextSlot: 1 };
    await saveData(data); expect(await loadData()).toEqual(data); expect(parseBackup(JSON.stringify(data))).toEqual(data);
  });
  it('accepts old backups without exercise preferences and persists new preferences', () => {
    const old = emptyData(); delete old.profile.programStyle; delete old.profile.includeCalves; delete old.profile.includeHipThrust;
    expect(parseBackup(JSON.stringify(old)).sessions).toEqual([]);
    const current = emptyData(); current.profile.programStyle = 'barbell'; current.profile.includeCalves = true;
    expect(parseBackup(JSON.stringify(current)).profile).toEqual(current.profile);
  });
  it('does not allow the synthetic demo into a personal backup', () => {
    const data = { ...emptyData(), sessions: demoSessions() };
    expect(() => parseBackup(JSON.stringify(data))).toThrow('지원하지');
  });
  it.each(['null', '{}', '{"schemaVersion":999}', 'bad json'])('rejects invalid backup %s', value => expect(() => parseBackup(value)).toThrow());
  it('rejects invalid measurements and duplicate workout identities', () => {
    expect(() => parseBackup(JSON.stringify({ ...emptyData(), profile: { ...emptyData().profile, weight: -1 } }))).toThrow();
    expect(() => parseBackup(JSON.stringify({ ...emptyData(), sessions: [makeSession(), makeSession()] }))).toThrow();
  });
  it('strips unexpected data rather than exposing it through application state', () => {
    const data = parseBackup(JSON.stringify({ ...emptyData(), unexpected: 'not kept' }));
    expect(data).not.toHaveProperty('unexpected');
  });
  it('rejects out-of-range recovery values and duplicate daily measurements', () => {
    const entry = { id: 'a', date: '2025-01-02', weight: null, waist: null, sleep: null, fatigue: 0, pain: null, protein: null, symptoms: false, notes: '' };
    expect(() => parseBackup(JSON.stringify({ ...emptyData(), checkIns: [entry] }))).toThrow();
    const valid = { ...entry, fatigue: 2 };
    expect(() => parseBackup(JSON.stringify({ ...emptyData(), checkIns: [valid, { ...valid, id: 'b' }] }))).toThrow();
  });
  it('clears previously saved personal records when saving an empty state', async () => {
    await saveData({ ...emptyData(), sessions: [makeSession()] }); await saveData(emptyData()); expect((await loadData()).sessions).toHaveLength(0);
  });
});
