"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Language = "en" | "zh";

const STORAGE_KEY = "myport-language";

export const translations = {
  en: {
    languageName: "English",
    languageLabel: "Display language",
    skipToMain: "Skip to main content",
    login: {
      intro: "Sign in with the single account configured by environment variables.",
      username: "Username",
      password: "Password",
      submit: "Sign in",
      loading: "Signing in...",
      failed: "Login failed."
    },
    dashboard: {
      intro:
        "Maintain your own service-port registry, scan current listeners, and import findings without changing any running service.",
      scanCurrent: "Scan current ports",
      scanning: "Scanning...",
      logout: "Logout",
      summaryLabel: "Port registry summary",
      stats: {
        total: "Saved records",
        active: "Active after scan",
        unregistered: "Unregistered scan",
        conflict: "Conflicts"
      },
      addRecord: "Add service record",
      editRecord: "Edit service record",
      cancelEdit: "Cancel edit",
      serviceName: "Service name",
      port: "Port",
      protocol: "Protocol",
      host: "Host",
      description: "Description",
      saveChanges: "Save changes",
      createRecord: "Create record",
      currentScan: "Current scan",
      refreshScan: "Refresh scan",
      noScan: "Run a scan to compare listening ports with the manual registry.",
      noScanResults: "No listening ports were returned by the scan adapter.",
      process: "Process",
      status: "Status",
      action: "Action",
      unknown: "Unknown",
      import: "Import",
      registered: "Registered",
      registry: "Saved ports",
      loadingRecords: "Loading records...",
      emptyRecords: "No saved ports yet. Add a service record or import from a scan.",
      service: "Service",
      savedPortsTable: "Saved ports table",
      endpoint: "Endpoint",
      createdAt: "Created",
      actions: "Actions",
      sortAscending: "ascending",
      sortDescending: "descending",
      sortBy: (label: string, direction: string) => `Sort by ${label} ${direction}`,
      noDescription: "No description",
      edit: "Edit",
      delete: "Delete",
      loadFailed: "Could not load records.",
      scanFailed: "Scan failed.",
      scanComplete: (count: number) => `Scan complete: ${count} listening port entries found.`,
      saveFailed: "Could not save record.",
      recordUpdated: "Record updated.",
      recordCreated: "Record created.",
      deleteFailed: "Could not delete record.",
      recordDeleted: "Record deleted.",
      importFailed: "Could not import scanned port.",
      imported: "Scanned port imported into registry.",
      importedDescription: (date: string) => `Imported from current scan on ${date}`,
      importedService: (port: number) => `Port ${port}`
    },
    statuses: {
      active: "Active",
      unregistered: "Unregistered",
      not_running: "Not running",
      conflict: "Conflict"
    }
  },
  zh: {
    languageName: "中文",
    languageLabel: "显示语言",
    skipToMain: "跳到主内容",
    login: {
      intro: "使用环境变量中配置的单一账号登录。",
      username: "用户名",
      password: "密码",
      submit: "登录",
      loading: "登录中...",
      failed: "登录失败。"
    },
    dashboard: {
      intro: "维护你的服务端口登记表、扫描当前监听端口，并在不修改真实服务的前提下导入扫描结果。",
      scanCurrent: "扫描当前端口",
      scanning: "扫描中...",
      logout: "退出登录",
      summaryLabel: "端口登记概览",
      stats: {
        total: "已保存记录",
        active: "扫描后活跃",
        unregistered: "未登记端口",
        conflict: "冲突"
      },
      addRecord: "添加服务记录",
      editRecord: "编辑服务记录",
      cancelEdit: "取消编辑",
      serviceName: "服务名",
      port: "端口",
      protocol: "协议",
      host: "Host",
      description: "介绍说明",
      saveChanges: "保存修改",
      createRecord: "创建记录",
      currentScan: "当前扫描",
      refreshScan: "刷新扫描",
      noScan: "运行扫描后，可将当前监听端口与手动登记表进行对比。",
      noScanResults: "扫描适配器未返回监听端口。",
      process: "进程",
      status: "状态",
      action: "操作",
      unknown: "未知",
      import: "导入",
      registered: "已登记",
      registry: "已保存端口",
      loadingRecords: "正在加载记录...",
      emptyRecords: "还没有保存端口。你可以添加服务记录，或从扫描结果导入。",
      service: "服务",
      savedPortsTable: "已保存端口表格",
      endpoint: "端点",
      createdAt: "创建时间",
      actions: "操作",
      sortAscending: "升序",
      sortDescending: "降序",
      sortBy: (label: string, direction: string) => `按${label}${direction}排序`,
      noDescription: "无介绍",
      edit: "编辑",
      delete: "删除",
      loadFailed: "无法加载记录。",
      scanFailed: "扫描失败。",
      scanComplete: (count: number) => `扫描完成：发现 ${count} 条监听端口记录。`,
      saveFailed: "无法保存记录。",
      recordUpdated: "记录已更新。",
      recordCreated: "记录已创建。",
      deleteFailed: "无法删除记录。",
      recordDeleted: "记录已删除。",
      importFailed: "无法导入扫描端口。",
      imported: "扫描端口已导入登记表。",
      importedDescription: (date: string) => `从 ${date} 的当前扫描导入`,
      importedService: (port: number) => `端口 ${port}`
    },
    statuses: {
      active: "活跃",
      unregistered: "未登记",
      not_running: "未运行",
      conflict: "冲突"
    }
  }
} as const;

type WidenLiterals<T> = T extends (...args: infer Args) => infer Return
  ? (...args: Args) => Return
  : T extends string
    ? string
    : T extends object
      ? { [Key in keyof T]: WidenLiterals<T[Key]> }
      : T;

export type TranslationCopy = WidenLiterals<(typeof translations)["en"]>;
export type StatusKey = keyof TranslationCopy["statuses"];
export type StatusLabels = TranslationCopy["statuses"];

type LanguageContextValue = {
  language: Language;
  copy: TranslationCopy;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "zh";
}

export function nextLanguage(language: Language): Language {
  return language === "en" ? "zh" : "en";
}

function languageToDocumentLang(language: Language) {
  return language === "zh" ? "zh-CN" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = languageToDocumentLang(next);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) {
      setLanguage(stored);
      return;
    }
    document.documentElement.lang = languageToDocumentLang("en");
  }, [setLanguage]);

  const value = useMemo(
    () => ({
      language,
      copy: translations[language],
      setLanguage
    }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }
  return context;
}

export function LanguageSelect() {
  const { copy, language, setLanguage } = useLanguage();

  return (
    <label className="language-select-field">
      <span className="language-select-label">{copy.languageLabel}</span>
      <select
        className="language-select"
        value={language}
        onChange={(event) => {
          const next = event.target.value;
          if (isLanguage(next)) setLanguage(next);
        }}
        aria-label={copy.languageLabel}
      >
        <option value="en">{translations.en.languageName}</option>
        <option value="zh">{translations.zh.languageName}</option>
      </select>
    </label>
  );
}
