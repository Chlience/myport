import { describe, expect, it } from "vitest";
import { isLanguage, nextLanguage, translations } from "@/app/ui/i18n";

describe("i18n", () => {
  it("accepts only supported languages", () => {
    expect(isLanguage("en")).toBe(true);
    expect(isLanguage("zh")).toBe(true);
    expect(isLanguage("fr")).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });

  it("toggles between English and Chinese", () => {
    expect(nextLanguage("en")).toBe("zh");
    expect(nextLanguage("zh")).toBe("en");
  });

  it("keeps dashboard and status translation keys aligned", () => {
    expect(Object.keys(translations.zh.dashboard).sort()).toEqual(Object.keys(translations.en.dashboard).sort());
    expect(Object.keys(translations.zh.statuses).sort()).toEqual(Object.keys(translations.en.statuses).sort());
  });

  it("provides Chinese copy for primary dashboard actions", () => {
    expect(translations.zh.dashboard.scanCurrent).toBe("扫描当前端口");
    expect(translations.zh.dashboard.scanComplete(2)).toBe("扫描完成：发现 2 条监听端口记录。");
    expect(translations.zh.statuses.not_running).toBe("未运行");
  });
});
