import { beforeEach, describe, expect, it } from "vitest";
import { getAchievements, isUnlocked, onAchievements, unlock } from "../src/lib/achievements";

describe("achievements store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(getAchievements()).toEqual([]);
    expect(isUnlocked("boot")).toBe(false);
  });

  it("unlocks an achievement exactly once", () => {
    expect(unlock("boot")).toBe(true);
    expect(unlock("boot")).toBe(false);
    expect(isUnlocked("boot")).toBe(true);
  });

  it("rejects unknown achievement ids", () => {
    expect(unlock("not-a-real-achievement")).toBe(false);
  });

  it("notifies subscribers on unlock", () => {
    const seen: string[][] = [];
    const off = onAchievements((ids) => seen.push(ids));
    unlock("explorer");
    off();
    unlock("archivist");
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain("explorer");
  });

  it("persists across reads", () => {
    unlock("ai");
    expect(JSON.parse(localStorage.getItem("hp_os_achievements")!)).toContain("ai");
  });
});
