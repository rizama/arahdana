import { Children, type MouseEventHandler, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { Feedback } from "../../src/web/components/Feedback";

const { showModal } = vi.hoisted(() => ({ showModal: vi.fn() }));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react, useRef: () => ({ current: { showModal } }) };
});

it("renders a separate launcher and closed feedback dialog without inline styles", () => {
  const html = renderToStaticMarkup(<Feedback />);
  expect(html).toMatch(/^<button[^>]+aria-controls="feedback-dialog".*<\/button><dialog[^>]+id="feedback-dialog"/);
  expect(html).not.toMatch(/<dialog[^>]+\bopen\b|\sstyle=/);
  expect(html).toContain('maxLength="254"');
  expect(html).toContain('maxLength="5000"');
});

it("opens the native modal when the launcher is clicked", () => {
  let click: MouseEventHandler<HTMLButtonElement> | undefined;
  function CaptureLauncher() {
    const widget = Feedback();
    const launcher = Children.toArray(widget.props.children)[0] as ReactElement<{
      onClick: MouseEventHandler<HTMLButtonElement>;
    }>;
    click = launcher.props.onClick;
    return widget;
  }
  renderToStaticMarkup(<CaptureLauncher />);
  const focus = vi.fn();
  expect(click).toBeTypeOf("function");
  click?.({ currentTarget: { focus } } as unknown as Parameters<MouseEventHandler<HTMLButtonElement>>[0]);
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(showModal).toHaveBeenCalledOnce();
});
