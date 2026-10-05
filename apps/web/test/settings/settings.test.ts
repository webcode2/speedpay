import { describe, expect, it } from "vitest";
import { SETTINGS_CATALOG } from "@/settings/catalog";
import { getSetting, getSettingNumber, invalidateSettingsCache } from "@/settings/settings";

describe("settings helpers", () => {
  it("falls back to catalog defaults without DB", async () => {
    invalidateSettingsCache();
    expect(await getSetting("deposit.min_amount")).toBe("100");
    expect(await getSettingNumber("security.session_ttl_days", 30)).toBe(30);
  });

  it("catalog covers required groups", () => {
    const groups = new Set(SETTINGS_CATALOG.map((s) => s.group));
    for (const g of [
      "app",
      "investment",
      "deposit",
      "withdrawal",
      "returns",
      "security",
      "notification",
    ]) {
      expect(groups.has(g)).toBe(true);
    }
  });
});
