// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Toggle } from "@/components/ui/Toggle";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { PremiumModal } from "@/components/ui/PremiumModal";
import { LoadingState } from "@/components/ui/LoadingState";
import { Avatar } from "@/components/Avatar";

afterEach(() => {
    cleanup();
});

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------
describe("Toggle", () => {
    it("renders a button and fires onChange when clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Toggle checked={false} onChange={onChange} />);

        const button = screen.getByRole("button");
        await user.click(button);

        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("applies the 'on' background color when checked", () => {
        render(<Toggle checked onChange={vi.fn()} />);
        const button = screen.getByRole("button");
        expect(button.className).toContain("bg-emerald-500");
        expect(button.className).not.toContain("bg-gray-200");
    });

    it("applies the 'off' background color when not checked", () => {
        render(<Toggle checked={false} onChange={vi.fn()} />);
        const button = screen.getByRole("button");
        expect(button.className).toContain("bg-gray-200");
        expect(button.className).not.toContain("bg-emerald-500");
    });

    it("moves the knob (translate-x-6) when checked", () => {
        const { container } = render(<Toggle checked onChange={vi.fn()} />);
        const knob = container.querySelector("span:last-child");
        expect(knob?.className).toContain("translate-x-6");
    });

    it("keeps the knob at translate-x-1 when off", () => {
        const { container } = render(<Toggle checked={false} onChange={vi.fn()} />);
        const knob = container.querySelector("span:last-child");
        expect(knob?.className).toContain("translate-x-1");
    });

    it("is disabled and does not fire onChange when disabled", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Toggle checked={false} onChange={onChange} disabled />);

        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
        await user.click(button);
        expect(onChange).not.toHaveBeenCalled();
        expect(button.className).toContain("cursor-not-allowed");
    });

    it("is disabled and does not fire onChange when loading", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Toggle checked onChange={onChange} loading />);

        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
        await user.click(button);
        expect(onChange).not.toHaveBeenCalled();
        expect(button.className).toContain("opacity-50");
    });

    it("applies cursor-pointer when interactive", () => {
        render(<Toggle checked={false} onChange={vi.fn()} />);
        expect(screen.getByRole("button").className).toContain("cursor-pointer");
    });

    it("merges a custom className", () => {
        render(<Toggle checked={false} onChange={vi.fn()} className="my-custom-class" />);
        expect(screen.getByRole("button").className).toContain("my-custom-class");
    });

    it("exposes the screen-reader label", () => {
        render(<Toggle checked={false} onChange={vi.fn()} />);
        expect(screen.getByText("Toggle setting")).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Dropdown + DropdownItem
// ---------------------------------------------------------------------------
describe("Dropdown", () => {
    it("hides its menu content until the trigger is clicked", () => {
        render(
            <Dropdown trigger={<button>Open menu</button>}>
                <DropdownItem>Hidden item</DropdownItem>
            </Dropdown>
        );
        expect(screen.queryByText("Hidden item")).not.toBeInTheDocument();
    });

    it("opens the menu when the trigger is clicked", async () => {
        const user = userEvent.setup();
        render(
            <Dropdown trigger={<span>Open menu</span>}>
                <DropdownItem>Visible item</DropdownItem>
            </Dropdown>
        );

        await user.click(screen.getByText("Open menu"));
        expect(screen.getByText("Visible item")).toBeInTheDocument();
        expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("toggles the menu closed on a second trigger click", async () => {
        const user = userEvent.setup();
        render(
            <Dropdown trigger={<span>Toggle</span>}>
                <DropdownItem>Item</DropdownItem>
            </Dropdown>
        );

        const trigger = screen.getByText("Toggle");
        await user.click(trigger);
        expect(screen.getByText("Item")).toBeInTheDocument();
        await user.click(trigger);
        expect(screen.queryByText("Item")).not.toBeInTheDocument();
    });

    it("closes the menu when clicking outside", async () => {
        const user = userEvent.setup();
        render(
            <div>
                <Dropdown trigger={<span>Open</span>}>
                    <DropdownItem>Inner</DropdownItem>
                </Dropdown>
                <button>Outside</button>
            </div>
        );

        await user.click(screen.getByText("Open"));
        expect(screen.getByText("Inner")).toBeInTheDocument();

        await user.click(screen.getByText("Outside"));
        expect(screen.queryByText("Inner")).not.toBeInTheDocument();
    });

    it("defaults to right alignment", async () => {
        const user = userEvent.setup();
        render(
            <Dropdown trigger={<span>Open</span>}>
                <DropdownItem>Item</DropdownItem>
            </Dropdown>
        );

        await user.click(screen.getByText("Open"));
        const menu = screen.getByRole("menu").parentElement as HTMLElement;
        expect(menu.className).toContain("right-0");
    });

    it("supports left alignment", async () => {
        const user = userEvent.setup();
        render(
            <Dropdown align="left" trigger={<span>Open</span>}>
                <DropdownItem>Item</DropdownItem>
            </Dropdown>
        );

        await user.click(screen.getByText("Open"));
        const menu = screen.getByRole("menu").parentElement as HTMLElement;
        expect(menu.className).toContain("left-0");
    });
});

describe("DropdownItem", () => {
    it("renders its children and fires onClick", async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<DropdownItem onClick={onClick}>Click me</DropdownItem>);

        await user.click(screen.getByText("Click me"));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("has the menuitem role", () => {
        render(<DropdownItem>Item</DropdownItem>);
        expect(screen.getByRole("menuitem")).toBeInTheDocument();
    });

    it("uses the default (non-danger) gray styling", () => {
        render(<DropdownItem>Normal</DropdownItem>);
        const button = screen.getByRole("menuitem");
        expect(button.className).toContain("text-gray-700");
        expect(button.className).not.toContain("text-red-600");
    });

    it("uses red styling for the danger variant", () => {
        render(<DropdownItem danger>Delete</DropdownItem>);
        const button = screen.getByRole("menuitem");
        expect(button.className).toContain("text-red-600");
        expect(button.className).toContain("hover:bg-red-50");
    });

    it("merges a custom className", () => {
        render(<DropdownItem className="extra-class">Item</DropdownItem>);
        expect(screen.getByRole("menuitem").className).toContain("extra-class");
    });

    it("does not throw when clicked without an onClick handler", async () => {
        const user = userEvent.setup();
        render(<DropdownItem>No handler</DropdownItem>);
        await expect(user.click(screen.getByRole("menuitem"))).resolves.toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// PremiumModal
// ---------------------------------------------------------------------------
describe("PremiumModal", () => {
    const baseProps = {
        title: "Title here",
        message: "Message body",
        type: "info" as const,
        isConfirm: false,
        onConfirm: vi.fn(),
        onCancel: vi.fn()
    };

    it("renders nothing when isOpen is false", () => {
        const { container } = render(<PremiumModal {...baseProps} isOpen={false} />);
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByText("Title here")).not.toBeInTheDocument();
    });

    it("renders the title and message when open", () => {
        render(<PremiumModal {...baseProps} isOpen />);
        expect(screen.getByText("Title here")).toBeInTheDocument();
        expect(screen.getByText("Message body")).toBeInTheDocument();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("shows the default confirm button text 'OK'", () => {
        render(<PremiumModal {...baseProps} isOpen />);
        expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
    });

    it("uses a custom confirm button label", () => {
        render(<PremiumModal {...baseProps} isOpen confirmText="Bekreft" />);
        expect(screen.getByRole("button", { name: "Bekreft" })).toBeInTheDocument();
    });

    it("fires onConfirm when the confirm button is clicked", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<PremiumModal {...baseProps} isOpen onConfirm={onConfirm} />);

        await user.click(screen.getByRole("button", { name: "OK" }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("does not render a cancel button when isConfirm is false", () => {
        render(<PremiumModal {...baseProps} isOpen isConfirm={false} />);
        // Only the single confirm button should exist.
        expect(screen.getAllByRole("button")).toHaveLength(1);
        expect(screen.queryByRole("button", { name: "Avbryt" })).not.toBeInTheDocument();
    });

    it("renders a cancel button with default label when isConfirm is true", () => {
        render(<PremiumModal {...baseProps} isOpen isConfirm />);
        expect(screen.getByRole("button", { name: "Avbryt" })).toBeInTheDocument();
        expect(screen.getAllByRole("button")).toHaveLength(2);
    });

    it("uses a custom cancel button label", () => {
        render(<PremiumModal {...baseProps} isOpen isConfirm cancelText="Lukk" />);
        expect(screen.getByRole("button", { name: "Lukk" })).toBeInTheDocument();
    });

    it("fires onCancel when the cancel button is clicked", async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();
        render(<PremiumModal {...baseProps} isOpen isConfirm onCancel={onCancel} />);

        await user.click(screen.getByRole("button", { name: "Avbryt" }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("fires onCancel when the backdrop is clicked", async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();
        render(<PremiumModal {...baseProps} isOpen onCancel={onCancel} />);

        const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(backdrop).toBeTruthy();
        await user.click(backdrop);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["info", "info", "text-blue-500"],
        ["success", "check_circle", "text-emerald-500"],
        ["warning", "warning", "text-amber-500"],
        ["error", "error", "text-red-500"]
    ] as const)("renders the %s icon and color", (type, iconName, colorClass) => {
        render(<PremiumModal {...baseProps} isOpen type={type} />);
        const icon = screen.getByText(iconName);
        expect(icon).toBeInTheDocument();
        expect(icon.className).toContain(colorClass);
    });

    it("applies the type-specific confirm button color", () => {
        render(<PremiumModal {...baseProps} isOpen type="error" />);
        const confirmBtn = screen.getByRole("button", { name: "OK" });
        expect(confirmBtn.className).toContain("bg-red-600");
    });
});

// ---------------------------------------------------------------------------
// LoadingState
// ---------------------------------------------------------------------------
describe("LoadingState", () => {
    it("renders the default Norwegian label", () => {
        render(<LoadingState />);
        expect(screen.getByText("Henter innhold...")).toBeInTheDocument();
    });

    it("renders a custom label", () => {
        render(<LoadingState label="Laster ned" />);
        expect(screen.getByText("Laster ned")).toBeInTheDocument();
    });

    it("renders an animated spinner", () => {
        const { container } = render(<LoadingState />);
        const spinner = container.querySelector(".animate-spin");
        expect(spinner).toBeTruthy();
    });

    it("applies the default container height class", () => {
        const { container } = render(<LoadingState />);
        expect((container.firstChild as HTMLElement).className).toContain("h-[50vh]");
    });

    it("applies a custom container className", () => {
        const { container } = render(<LoadingState className="h-full" />);
        const root = container.firstChild as HTMLElement;
        expect(root.className).toContain("h-full");
        expect(root.className).not.toContain("h-[50vh]");
    });

    it("applies the default spinner size class", () => {
        const { container } = render(<LoadingState />);
        expect(container.querySelector(".animate-spin")?.className).toContain("h-8 w-8");
    });

    it("applies a custom spinner size class", () => {
        const { container } = render(<LoadingState spinnerSizeClassName="h-4 w-4" />);
        expect(container.querySelector(".animate-spin")?.className).toContain("h-4 w-4");
    });
});

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
describe("Avatar", () => {
    it("renders an image when src is provided", () => {
        render(<Avatar src="https://img.example/me.png" alt="My avatar" />);
        const img = screen.getByRole("img", { name: "My avatar" });
        expect(img).toHaveAttribute("src", "https://img.example/me.png");
    });

    it("falls back to initials when no src is given", () => {
        render(<Avatar initials="John" />);
        // Only the first two characters, uppercased.
        expect(screen.getByText("JO")).toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("uppercases two-letter initials", () => {
        render(<Avatar initials="ab" />);
        expect(screen.getByText("AB")).toBeInTheDocument();
    });

    it("renders a '?' fallback when neither src nor initials are provided", () => {
        render(<Avatar />);
        expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("renders '?' when initials is an empty string", () => {
        render(<Avatar initials="" />);
        expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("renders '?' when initials is null", () => {
        render(<Avatar initials={null} />);
        expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("prefers the image over initials when both are provided", () => {
        render(<Avatar src="https://img.example/me.png" initials="XY" />);
        expect(screen.getByRole("img")).toBeInTheDocument();
        expect(screen.queryByText("XY")).not.toBeInTheDocument();
    });

    it("uses the alt text as the container title", () => {
        const { container } = render(<Avatar initials="AB" alt="Member portrait" />);
        const root = container.firstChild as HTMLElement;
        expect(root).toHaveAttribute("title", "Member portrait");
    });

    it.each([
        ["xs", "w-6 h-6"],
        ["sm", "w-8 h-8"],
        ["md", "w-10 h-10"],
        ["lg", "w-12 h-12"],
        ["xl", "w-16 h-16"]
    ] as const)("applies the %s size class", (size, expected) => {
        const { container } = render(<Avatar initials="AB" size={size} />);
        expect((container.firstChild as HTMLElement).className).toContain(expected);
    });

    it("defaults to medium size when size is omitted", () => {
        const { container } = render(<Avatar initials="AB" />);
        expect((container.firstChild as HTMLElement).className).toContain("w-10 h-10");
    });

    it("merges a custom className on the container", () => {
        const { container } = render(<Avatar initials="AB" className="ring-2" />);
        expect((container.firstChild as HTMLElement).className).toContain("ring-2");
    });

    it("merges a custom imageClassName on the image", () => {
        render(<Avatar src="https://img.example/me.png" imageClassName="grayscale" />);
        expect(within(screen.getByRole("img").parentElement as HTMLElement).getByRole("img").className).toContain("grayscale");
    });

    it("uses the default alt text 'Avatar' for the image", () => {
        render(<Avatar src="https://img.example/me.png" />);
        expect(screen.getByRole("img", { name: "Avatar" })).toBeInTheDocument();
    });
});
