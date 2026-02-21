import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Toast, { toast } from "../../components/Toast";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the toast container", () => {
    const { container } = render(<Toast />);
    expect(container.querySelector(".toast-container")).toBeInTheDocument();
  });

  it("starts with no toasts visible", () => {
    render(<Toast />);
    expect(screen.queryByText(/.+/)).toBeNull();
  });

  it("shows a toast when toast() is called", () => {
    render(<Toast />);
    act(() => {
      toast("Hello world", "info");
    });
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("applies correct CSS class for success type", () => {
    render(<Toast />);
    act(() => {
      toast("Success!", "success");
    });
    const el = screen.getByText("Success!");
    expect(el.className).toContain("success");
  });

  it("applies correct CSS class for error type", () => {
    render(<Toast />);
    act(() => {
      toast("Error!", "error");
    });
    const el = screen.getByText("Error!");
    expect(el.className).toContain("error");
  });

  it("applies correct CSS class for info type", () => {
    render(<Toast />);
    act(() => {
      toast("Info!", "info");
    });
    const el = screen.getByText("Info!");
    expect(el.className).toContain("info");
  });

  it("defaults to info type when no type is specified", () => {
    render(<Toast />);
    act(() => {
      toast("Default type");
    });
    const el = screen.getByText("Default type");
    expect(el.className).toContain("info");
  });

  it("supports multiple toasts at once", () => {
    render(<Toast />);
    act(() => {
      toast("First", "info");
      toast("Second", "success");
      toast("Third", "error");
    });
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
  });

  it("auto-dismisses toast after 5000ms (state removed, exit animation pending)", () => {
    render(<Toast />);
    act(() => {
      toast("Disappearing", "info");
    });
    expect(screen.getByText("Disappearing")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5100);
    });

    // After the timeout fires, the toast is removed from React state.
    // AnimatePresence may keep the DOM node briefly for exit animation,
    // so we check the element has exit animation styles applied.
    const el = screen.queryByText("Disappearing");
    if (el) {
      // Element still in DOM due to AnimatePresence exit — verify it has exit styles
      expect(el.style.opacity).toBe("0");
    }
    // If el is null, the toast was fully removed — also fine
  });

  it("each toast has the .toast class", () => {
    render(<Toast />);
    act(() => {
      toast("Styled", "success");
    });
    const el = screen.getByText("Styled");
    expect(el.className).toContain("toast");
  });
});
