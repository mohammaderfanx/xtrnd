import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ unfurl: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.unfurl }));
vi.mock("@/lib/unfurl.functions", () => ({ unfurlX: {} }));
vi.mock("@/lib/pro.functions", () => ({ dispatchFeeds: {} }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/components/ItemBits", () => ({ Avatar: () => null }));
vi.mock("@/lib/xtrnd", () => ({
  CATEGORIES: ["AI & Tech"], TYPES: ["Post"], detectType: () => "Post", fmt: String,
  useSession: () => ({ ready: true, session: { user: { id: "user" } } }),
}));

import { Route } from "@/routes/submit";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

it("ignores a previous link response after the URL changes", async () => {
  vi.useFakeTimers();
  let resolve: (value: unknown) => void = () => {};
  mocks.unfurl.mockImplementation(() => new Promise((r) => { resolve = r; }));
  const Component = Route.options.component;
  if (!Component) throw new Error("Missing submission page");
  render(<Component />);
  fireEvent.change(screen.getByLabelText("X.com URL"), { target: { value: "https://x.com/first/status/1" } });
  await act(async () => { vi.advanceTimersByTime(350); });
  fireEvent.change(screen.getByLabelText("X.com URL"), { target: { value: "invalid" } });
  await act(async () => { resolve({ ok: true, item: { text: "Stale post", type: "Post", author_name: "First", author_handle: "@first", metrics: { views: 1, likes: 1 } } }); });
  expect(screen.getByLabelText("Key takeaway")).toHaveValue("");
  expect(screen.queryByText("First")).not.toBeInTheDocument();
});