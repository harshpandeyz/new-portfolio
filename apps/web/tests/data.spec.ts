import { createElement } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicHomeData } from "@hp/shared";
import { api } from "../src/lib/api";
import { DataProvider, useData } from "../src/lib/data";

function Probe() {
  const { profile, projects, error, refresh } = useData();
  return createElement("div", null,
    createElement("output", { "data-testid": "content" }, `${profile?.name ?? "missing"}|${projects[0]?.title ?? "missing"}`),
    error && createElement("p", { role: "status" }, error),
    createElement("button", { type: "button", onClick: () => void refresh() }, "Refresh"),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("public data refresh", () => {
  it("keeps the last good content when a later refresh fails", async () => {
    const payload = {
      profile: { name: "Harsh" }, projects: [{ title: "CCTV-X" }], projectIndex: [], projectCount: 1,
      certificates: [], certTotal: 0, skills: [], education: [],
      publicSettings: { chatEnabled: true, contactEnabled: true, maintenanceMode: false, analyticsEnabled: false },
    } as unknown as PublicHomeData;
    const home = vi.spyOn(api, "publicHome").mockResolvedValue(payload);
    const timeline = vi.spyOn(api, "timeline").mockResolvedValue({ items: [] });

    render(createElement(DataProvider, null, createElement(Probe)));
    await waitFor(() => expect(screen.getByTestId("content").textContent).toBe("Harsh|CCTV-X"));

    home.mockRejectedValueOnce(new Error("offline"));

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Refresh" })); });
    await waitFor(() => expect(screen.getByText("Some content is temporarily unavailable.")).toBeTruthy());
    expect(screen.getByTestId("content").textContent).toBe("Harsh|CCTV-X");
    expect(timeline).not.toHaveBeenCalled();
  });
});
