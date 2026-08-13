import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PeerSession, PeerSessionHandlers } from "@/lib/peer-session";
import { TransferWorkspace } from "./transfer-workspace";

function fakeSession(): PeerSession {
  return {
    connection: null,
    send: vi.fn(),
    close: vi.fn(),
  };
}

describe("TransferWorkspace interactions", () => {
  it("switches the focused mobile panel without unmounting either transfer card", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TransferWorkspace
        sessionFactories={{ sender: vi.fn(), receiver: vi.fn() }}
      />,
    );
    const send = screen.getByRole("button", { name: "Send files" });
    const receive = screen.getByRole("button", { name: "Receive files" });

    expect(send).toHaveAttribute("aria-pressed", "true");
    expect(receive).toHaveAttribute("aria-pressed", "false");
    await user.click(receive);
    expect(send).toHaveAttribute("aria-pressed", "false");
    expect(receive).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".send-card")).toBeInTheDocument();
    expect(container.querySelector(".receive-card")).toBeInTheDocument();
  });

  it("selects files, generates a receive code, and allows removal", async () => {
    const user = userEvent.setup();
    const sender = vi.fn(async () => fakeSession());
    render(
      <TransferWorkspace
        sessionFactories={{ sender, receiver: vi.fn() }}
      />,
    );

    await user.upload(screen.getByLabelText(/choose files/i), [
      new File(["hello"], "hello.txt", { type: "text/plain" }),
      new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
    ]);

    expect(await screen.findByText("hello.txt")).toBeInTheDocument();
    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    expect(screen.getByText(/^[0-9]{4}(?:-[a-z]+){3}$/)).toBeInTheDocument();
    expect(sender).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /remove photo.jpg/i }));
    expect(screen.queryByText("photo.jpg")).not.toBeInTheDocument();
  });

  it("normalizes valid receive codes and keeps invalid codes editable", async () => {
    const user = userEvent.setup();
    const receiver = vi.fn(async () => fakeSession());
    render(
      <TransferWorkspace
        sessionFactories={{ sender: vi.fn(), receiver }}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Receive code" });

    await user.type(input, "not a code");
    await user.click(screen.getByRole("button", { name: /connect with receive code/i }));
    expect(screen.getByText(/four digits and three words/i)).toBeInTheDocument();
    expect(input).toHaveValue("not a code");

    await user.clear(input);
    await user.type(input, " 8827 Dance Gong Place ");
    await user.click(screen.getByRole("button", { name: /connect with receive code/i }));

    await waitFor(() =>
      expect(receiver).toHaveBeenCalledWith(
        "8827-dance-gong-place",
        expect.any(Object),
      ),
    );
  });

  it("automatically accepts a valid manifest without another permission click", async () => {
    const user = userEvent.setup();
    const session = fakeSession();
    let handlers: PeerSessionHandlers | undefined;
    const receiver = vi.fn(async (_code: string, next: PeerSessionHandlers) => {
      handlers = next;
      return session;
    });
    render(
      <TransferWorkspace
        sessionFactories={{ sender: vi.fn(), receiver }}
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Receive code" }),
      "8827-dance-gong-place",
    );
    await user.click(
      screen.getByRole("button", { name: /connect with receive code/i }),
    );
    await waitFor(() => expect(handlers).toBeDefined());

    await act(async () => {
      handlers?.onData?.({
        protocolVersion: 1,
        type: "manifest",
        transferId: "transfer-1",
        files: [
          { id: "file-1", name: "hello.txt", size: 5, type: "text/plain" },
        ],
      });
    });

    expect(session.send).toHaveBeenCalledWith({
      protocolVersion: 1,
      type: "accept",
    });
    expect(
      screen.queryByRole("button", { name: /accept files/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/download will start automatically/i),
    ).toBeInTheDocument();
  });
});
