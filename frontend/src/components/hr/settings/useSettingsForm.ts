/**
 * Owns settings form state, per-section dirty tracking, and per-section save.
 *
 * Why per-section:
 *  - Saving the whole document from every tab meant two HR users editing
 *    different tabs would clobber each other (last write wins, no error).
 *  - The department endpoint only accepts attendance + general, so sending
 *    notifications alongside them was silently stripped.
 *
 * Why dirty tracking:
 *  - The old sync effect reset the entire form whenever the query data changed
 *    identity, including the refetch triggered by any save. Unsaved edits in
 *    other tabs vanished. Here a section is only re-baselined from the server
 *    while it is clean.
 */

import { useCallback, useState } from 'react';
import type { SettingsFormData } from './types';
import type { GlobalSettings, DepartmentSettings } from '@/types';
import {
  DEFAULT_SETTINGS_FORM,
  mergeAttendance,
  mergeGeneral,
  mergeNotifications,
  mergeRequestRetention,
} from './settingsDefaults';

export type SettingsSection = keyof SettingsFormData;

/** Sections the department-scoped endpoint accepts. */
export const DEPARTMENT_SECTIONS: readonly SettingsSection[] = ['attendance', 'general'];

export type DirtyMap = Record<SettingsSection, boolean>;

const NO_SECTIONS_DIRTY: DirtyMap = {
  attendance: false,
  notifications: false,
  general: false,
  requestRetention: false,
};

type ServerSettings = Partial<GlobalSettings> | Partial<DepartmentSettings> | undefined;

const toFormData = (data: ServerSettings): SettingsFormData => {
  const notifications = (data as Partial<GlobalSettings> | undefined)?.notifications;
  const requestRetention = (data as Partial<GlobalSettings> | undefined)?.requestRetention;
  return {
    attendance: mergeAttendance(data?.attendance),
    notifications: mergeNotifications(notifications),
    general: mergeGeneral(data?.general),
    requestRetention: mergeRequestRetention(requestRetention),
  };
};

interface UseSettingsFormArgs {
  /** The settings document for the current scope, or undefined while loading. */
  serverData: ServerSettings;
  /** Scope key; changing it forces a full re-baseline and drops dirty state. */
  scopeKey: string;
}

export interface UseSettingsFormResult {
  formData: SettingsFormData;
  dirty: DirtyMap;
  isAnyDirty: boolean;
  /** Replace one section wholesale (used by the section components). */
  setSection: <K extends SettingsSection>(section: K, value: SettingsFormData[K]) => void;
  /** Update one section via a partial patch. */
  patchSection: <K extends SettingsSection>(
    section: K,
    patch: Partial<SettingsFormData[K]>
  ) => void;
  /** Discard local edits for a section and fall back to the server value. */
  resetSection: (section: SettingsSection) => void;
  /** Discard all local edits. */
  resetAll: () => void;
  /** Mark sections clean after a successful save. */
  markSaved: (sections: readonly SettingsSection[]) => void;
}

export const useSettingsForm = ({
  serverData,
  scopeKey,
}: UseSettingsFormArgs): UseSettingsFormResult => {
  const [formData, setFormData] = useState<SettingsFormData>(DEFAULT_SETTINGS_FORM);
  const [dirty, setDirty] = useState<DirtyMap>(NO_SECTIONS_DIRTY);
  const [synced, setSynced] = useState<{ serverData: ServerSettings | undefined; scopeKey: string }>({
    serverData: undefined,
    scopeKey,
  });

  if (synced.serverData !== serverData || synced.scopeKey !== scopeKey) {
    const scopeChanged = synced.scopeKey !== scopeKey;
    setSynced({ serverData, scopeKey });

    if (!serverData) {
      // Switching to a scope with no saved document yet: show defaults rather
      // than leaving the previous scope's values on screen.
      if (scopeChanged) {
        setFormData(DEFAULT_SETTINGS_FORM);
        setDirty(NO_SECTIONS_DIRTY);
      }
    } else if (scopeChanged) {
      setFormData(toFormData(serverData));
      setDirty(NO_SECTIONS_DIRTY);
    } else {
      // Same scope: only adopt server values for sections the user has not
      // edited, so a background refetch cannot discard unsaved work.
      const next = toFormData(serverData);
      setFormData((current) => ({
        attendance: dirty.attendance ? current.attendance : next.attendance,
        notifications: dirty.notifications ? current.notifications : next.notifications,
        general: dirty.general ? current.general : next.general,
        requestRetention: dirty.requestRetention ? current.requestRetention : next.requestRetention,
      }));
    }
  }

  const setSection = useCallback(
    <K extends SettingsSection>(section: K, value: SettingsFormData[K]) => {
      setFormData((current) => ({ ...current, [section]: value }));
      setDirty((current) => ({ ...current, [section]: true }));
    },
    []
  );

  const patchSection = useCallback(
    <K extends SettingsSection>(section: K, patch: Partial<SettingsFormData[K]>) => {
      setFormData((current) => ({
        ...current,
        [section]: { ...current[section], ...patch },
      }));
      setDirty((current) => ({ ...current, [section]: true }));
    },
    []
  );

  const resetSection = useCallback(
    (section: SettingsSection) => {
      const fromServer = toFormData(serverData);
      setFormData((current) => ({ ...current, [section]: fromServer[section] }));
      setDirty((current) => ({ ...current, [section]: false }));
    },
    [serverData]
  );

  const resetAll = useCallback(() => {
    setFormData(toFormData(serverData));
    setDirty(NO_SECTIONS_DIRTY);
  }, [serverData]);

  const markSaved = useCallback((sections: readonly SettingsSection[]) => {
    setDirty((current) => {
      const next = { ...current };
      for (const section of sections) next[section] = false;
      return next;
    });
  }, []);

  const isAnyDirty = dirty.attendance || dirty.notifications || dirty.general || dirty.requestRetention;

  return {
    formData,
    dirty,
    isAnyDirty,
    setSection,
    patchSection,
    resetSection,
    resetAll,
    markSaved,
  };
};
