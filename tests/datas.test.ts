import { describe, expect, it } from "vitest";
import { hora } from "@/lib/datas";
import { spDe } from "@/lib/fuso";

describe("hora", () => {
  it("usa h minúsculo, como no português escrito", () => {
    expect(hora(spDe(2026, 9, 6, 9, 0))).toBe("9h");
    expect(hora(spDe(2026, 9, 6, 18, 30))).toBe("18h30");
    expect(hora(spDe(2026, 9, 6, 7, 5))).toBe("7h05");
  });
});
