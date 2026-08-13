import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TransferWorkspace } from "./transfer-workspace";

it("offers send and receive actions with the expected receive-code example", () => {
  render(<TransferWorkspace />);

  expect(
    screen.getByRole("heading", { name: /send files, simply/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/choose files/i)).toHaveAttribute("type", "file");
  expect(screen.getByRole("textbox", { name: "Receive code" })).toHaveAttribute(
    "placeholder",
    "8827-dance-gong-place",
  );
});
