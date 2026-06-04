// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Per-file mocks (this file's components import these) ---

// The finance server actions invoked by both components. Each returns a success-shape by default;
// individual tests override the return value with mockResolvedValueOnce where needed.
const setInvoiceStatusMock = vi.fn(async () => ({ success: true }));
const setMonthlyFeePausePreferenceMock = vi.fn(async () => ({ success: true, enabled: true }));
const createFutureMonthlyFeesMock = vi.fn(async () => ({ success: true, created: 3, skipped: 0 }));
vi.mock("@/server/actions/finance", () => ({
    setInvoiceStatus: (...args: unknown[]) => setInvoiceStatusMock(...args),
    setMonthlyFeePausePreference: (...args: unknown[]) => setMonthlyFeePausePreferenceMock(...args),
    createFutureMonthlyFees: (...args: unknown[]) => createFutureMonthlyFeesMock(...args)
}));

// useModal — the InvoiceStatusModal pulls openAlert from here.
const openAlertMock = vi.fn(async () => undefined);
const openConfirmMock = vi.fn(async () => true);
vi.mock("@/components/providers/ModalContext", () => ({
    useModal: () => ({ openAlert: openAlertMock, openConfirm: openConfirmMock, closeModal: vi.fn() })
}));

// next/navigation is globally mocked in setup.ts but without useRouter; the MonthlyFeePauseCard
// needs router.refresh(). Re-declare the module here with the pieces both consumers rely on.
const routerRefreshMock = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: routerRefreshMock, push: vi.fn(), replace: vi.fn() }),
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    })
}));

import { RequestStatus } from "@prisma/client";
import { InvoiceStatusModal, type InvoiceStatusTarget } from "@/components/admin/finance/InvoiceStatusModal";
import { MonthlyFeePauseCard } from "@/components/dashboard/MonthlyFeePauseCard";
import { CreateInvoiceModal } from "@/components/admin/finance/CreateInvoiceModal";

beforeEach(() => {
    setInvoiceStatusMock.mockReset();
    setInvoiceStatusMock.mockResolvedValue({ success: true });
    setMonthlyFeePausePreferenceMock.mockReset();
    setMonthlyFeePausePreferenceMock.mockResolvedValue({ success: true, enabled: true });
    openAlertMock.mockReset();
    openAlertMock.mockResolvedValue(undefined);
    openConfirmMock.mockReset();
    openConfirmMock.mockResolvedValue(true);
    routerRefreshMock.mockReset();
    createFutureMonthlyFeesMock.mockReset();
    createFutureMonthlyFeesMock.mockResolvedValue({ success: true, created: 3, skipped: 0 });
});

afterEach(() => {
    cleanup();
});

// ---------------------------------------------------------------------------
// InvoiceStatusModal
// ---------------------------------------------------------------------------

const baseInvoice = (overrides: Partial<InvoiceStatusTarget> = {}): InvoiceStatusTarget => ({
    id: "req_1",
    memberName: "Ola Nordmann",
    title: "Medlemskontingent 2026-06",
    amount: 750,
    status: RequestStatus.PENDING,
    ...overrides
});

/** All four status labels rendered by the modal, in declaration order. */
const STATUS_LABELS = ["Betalt", "Ubetalt", "Satt på pause", "Ettergitt"];

describe("InvoiceStatusModal", () => {
    it("renders nothing when no invoice is provided", () => {
        const { container } = render(
            <InvoiceStatusModal invoice={null} onClose={vi.fn()} onSuccess={vi.fn()} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the dialog header with member name, title and formatted amount", () => {
        render(
            <InvoiceStatusModal invoice={baseInvoice()} onClose={vi.fn()} onSuccess={vi.fn()} />
        );
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Endre status")).toBeInTheDocument();
        expect(screen.getByText("Ola Nordmann")).toBeInTheDocument();
        // amount is formatted nb-NO with two decimals: "750,00"
        expect(screen.getByText(/Medlemskontingent 2026-06/)).toHaveTextContent("750,00");
    });

    it("renders all four status options", () => {
        render(
            <InvoiceStatusModal invoice={baseInvoice()} onClose={vi.fn()} onSuccess={vi.fn()} />
        );
        for (const label of STATUS_LABELS) {
            expect(screen.getByText(label)).toBeInTheDocument();
        }
    });

    it("marks the current status option with a 'Nåværende' badge", () => {
        render(
            <InvoiceStatusModal
                invoice={baseInvoice({ status: RequestStatus.PAUSED })}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        );
        expect(screen.getByText("Nåværende")).toBeInTheDocument();
    });

    it("shows the unchanged hint and disables Bekreft when status is not changed", () => {
        render(
            <InvoiceStatusModal invoice={baseInvoice()} onClose={vi.fn()} onSuccess={vi.fn()} />
        );
        expect(screen.getByText("Velg en ny status for å gjøre en endring.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Bekreft" })).toBeDisabled();
    });

    it("shows the deposit effect note and enables Bekreft when selecting Betalt from a non-paid status", async () => {
        const user = userEvent.setup();
        render(
            <InvoiceStatusModal
                invoice={baseInvoice({ status: RequestStatus.PENDING, amount: 750 })}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        );

        await user.click(screen.getByText("Betalt"));

        expect(
            screen.getByText(/Registrerer innbetaling og øker medlemmets saldo med 750,00 kr\./)
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Bekreft" })).toBeEnabled();
    });

    it("shows the withdrawal effect note when leaving Betalt (PAID -> another status)", async () => {
        const user = userEvent.setup();
        render(
            <InvoiceStatusModal
                invoice={baseInvoice({ status: RequestStatus.PAID, amount: 1200 })}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        );

        // Currently PAID — selecting "Ubetalt" leaves PAID.
        await user.click(screen.getByText("Ubetalt"));

        expect(
            screen.getByText(/Fjerner registrert innbetaling og reduserer medlemmets saldo med 1\s?200,00 kr\./)
        ).toBeInTheDocument();
    });

    it("shows the neutral 'Ingen endring i saldo' note for non-balance status changes", async () => {
        const user = userEvent.setup();
        render(
            <InvoiceStatusModal
                invoice={baseInvoice({ status: RequestStatus.PENDING })}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        );

        // PENDING -> WAIVED: neither entering nor leaving PAID.
        await user.click(screen.getByText("Ettergitt"));

        expect(screen.getByText("Ingen endring i saldo.")).toBeInTheDocument();
    });

    it("calls setInvoiceStatus with the chosen status, then onClose and onSuccess on success", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const onSuccess = vi.fn(async () => undefined);
        render(
            <InvoiceStatusModal
                invoice={baseInvoice({ id: "req_42", status: RequestStatus.PENDING })}
                onClose={onClose}
                onSuccess={onSuccess}
            />
        );

        await user.click(screen.getByText("Betalt"));
        await user.click(screen.getByRole("button", { name: "Bekreft" }));

        expect(setInvoiceStatusMock).toHaveBeenCalledWith("req_42", RequestStatus.PAID);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(openAlertMock).not.toHaveBeenCalled();
    });

    it("does not invoke the server action when Bekreft is clicked without changing status", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <InvoiceStatusModal invoice={baseInvoice()} onClose={onClose} onSuccess={vi.fn()} />
        );

        // Bekreft is disabled, so a click is a no-op; assert the action is never called.
        await user.click(screen.getByRole("button", { name: "Bekreft" }));
        expect(setInvoiceStatusMock).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("opens an error alert and does not close when the server action returns success:false", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        setInvoiceStatusMock.mockResolvedValueOnce({ success: false, error: "Kan ikke endre" } as never);
        render(
            <InvoiceStatusModal
                invoice={baseInvoice({ status: RequestStatus.PENDING })}
                onClose={onClose}
                onSuccess={onSuccess}
            />
        );

        await user.click(screen.getByText("Betalt"));
        await user.click(screen.getByRole("button", { name: "Bekreft" }));

        expect(openAlertMock).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Feil", message: "Kan ikke endre", type: "error" })
        );
        expect(onClose).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it("opens a generic error alert when the server action throws", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        setInvoiceStatusMock.mockRejectedValueOnce(new Error("network"));
        render(
            <InvoiceStatusModal
                invoice={baseInvoice({ status: RequestStatus.PENDING })}
                onClose={onClose}
                onSuccess={vi.fn()}
            />
        );

        await user.click(screen.getByText("Betalt"));
        await user.click(screen.getByRole("button", { name: "Bekreft" }));

        expect(openAlertMock).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Feil", type: "error" })
        );
        expect(onClose).not.toHaveBeenCalled();
    });

    it("invokes onClose when the Avbryt button is clicked", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <InvoiceStatusModal invoice={baseInvoice()} onClose={onClose} onSuccess={vi.fn()} />
        );

        await user.click(screen.getByRole("button", { name: "Avbryt" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// MonthlyFeePauseCard
// ---------------------------------------------------------------------------

describe("MonthlyFeePauseCard", () => {
    const getToggle = () => screen.getByRole("button", { name: /Stopp medlemskontigent/ });

    it("disables the toggle when the balance does not exceed the cap (4500)", () => {
        render(<MonthlyFeePauseCard initialEnabled={false} balance={4500} cap={4500} />);
        // balance is not strictly greater than cap → ineligible.
        expect(getToggle()).toBeDisabled();
    });

    it("disables the toggle when the balance is below the cap", () => {
        render(<MonthlyFeePauseCard initialEnabled={false} balance={1000} cap={4500} />);
        expect(getToggle()).toBeDisabled();
    });

    it("enables the toggle when the balance exceeds the cap", () => {
        render(<MonthlyFeePauseCard initialEnabled={false} balance={4501} cap={4500} />);
        expect(getToggle()).toBeEnabled();
    });

    it("does not call the server action when an ineligible toggle is clicked", async () => {
        const user = userEvent.setup();
        render(<MonthlyFeePauseCard initialEnabled={false} balance={100} cap={4500} />);
        // userEvent skips clicks on disabled elements; force the click to prove the guard holds.
        await user.click(getToggle(), { pointerEventsCheck: 0 });
        expect(setMonthlyFeePausePreferenceMock).not.toHaveBeenCalled();
    });

    it("forces enabled off when balance falls below cap even if initialEnabled was true", () => {
        render(<MonthlyFeePauseCard initialEnabled={true} balance={100} cap={4500} />);
        const toggle = getToggle();
        expect(toggle).toHaveAttribute("aria-pressed", "false");
        expect(within(toggle).getByText("Ikke aktivert")).toBeInTheDocument();
    });

    it("toggles ON: calls setMonthlyFeePausePreference(true), reflects the result and refreshes the router", async () => {
        const user = userEvent.setup();
        setMonthlyFeePausePreferenceMock.mockResolvedValueOnce({ success: true, enabled: true });
        render(<MonthlyFeePauseCard initialEnabled={false} balance={5000} cap={4500} />);

        await user.click(getToggle());

        expect(setMonthlyFeePausePreferenceMock).toHaveBeenCalledWith(true);
        expect(getToggle()).toHaveAttribute("aria-pressed", "true");
        expect(within(getToggle()).getByText("Aktivert")).toBeInTheDocument();
        expect(routerRefreshMock).toHaveBeenCalled();
    });

    it("toggles OFF: calls setMonthlyFeePausePreference(false) when already enabled", async () => {
        const user = userEvent.setup();
        setMonthlyFeePausePreferenceMock.mockResolvedValueOnce({ success: true, enabled: false });
        render(<MonthlyFeePauseCard initialEnabled={true} balance={5000} cap={4500} />);

        // Starts enabled (eligible), toggling sends false.
        await user.click(getToggle());

        expect(setMonthlyFeePausePreferenceMock).toHaveBeenCalledWith(false);
        expect(getToggle()).toHaveAttribute("aria-pressed", "false");
    });

    it("falls back to nextEnabled when the action omits an explicit enabled flag", async () => {
        const user = userEvent.setup();
        setMonthlyFeePausePreferenceMock.mockResolvedValueOnce({ success: true } as never);
        render(<MonthlyFeePauseCard initialEnabled={false} balance={5000} cap={4500} />);

        await user.click(getToggle());

        expect(getToggle()).toHaveAttribute("aria-pressed", "true");
    });

    it("surfaces the server error, forces the toggle off and still refreshes on failure", async () => {
        const user = userEvent.setup();
        setMonthlyFeePausePreferenceMock.mockResolvedValueOnce({
            success: false,
            error: "Saldoen er for lav"
        } as never);
        render(<MonthlyFeePauseCard initialEnabled={false} balance={5000} cap={4500} />);

        await user.click(getToggle());

        expect(screen.getByText("Saldoen er for lav")).toBeInTheDocument();
        expect(getToggle()).toHaveAttribute("aria-pressed", "false");
        expect(routerRefreshMock).toHaveBeenCalled();
    });

    it("shows a default error message when the failed action omits one", async () => {
        const user = userEvent.setup();
        setMonthlyFeePausePreferenceMock.mockResolvedValueOnce({ success: false } as never);
        render(<MonthlyFeePauseCard initialEnabled={false} balance={5000} cap={4500} />);

        await user.click(getToggle());

        expect(screen.getByText("Kunne ikke oppdatere innstillingen.")).toBeInTheDocument();
    });

    it("renders without the card chrome in embedded mode but keeps the toggle", () => {
        render(
            <MonthlyFeePauseCard initialEnabled={false} balance={5000} cap={4500} mode="embedded" />
        );
        expect(screen.getByRole("button", { name: /Stopp medlemskontigent/ })).toBeInTheDocument();
        expect(screen.getByText("Aktiver saldo grense")).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// CreateInvoiceModal (optional)
// ---------------------------------------------------------------------------

describe("CreateInvoiceModal", () => {
    const members = [
        { id: "m1", name: "Ola Nordmann" },
        { id: "m2", name: "Kari Nordmann" }
    ];

    /** The member combobox is the one whose options include "Velg medlem...". */
    const getMemberSelect = () =>
        screen
            .getAllByRole("combobox")
            .find((el) => within(el).queryByText("Velg medlem...")) as HTMLSelectElement;

    it("blocks submission with a warning when no member is selected", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const onSuccess = vi.fn();

        render(
            <CreateInvoiceModal isOpen={true} onClose={onClose} members={members} onSuccess={onSuccess} />
        );

        await user.click(screen.getByRole("button", { name: "Opprett Krav" }));

        expect(openAlertMock).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Mangler info", type: "warning" })
        );
        expect(createFutureMonthlyFeesMock).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it("submits the selected member with the default count of 1 and reports success", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const onSuccess = vi.fn();

        render(
            <CreateInvoiceModal isOpen={true} onClose={onClose} members={members} onSuccess={onSuccess} />
        );

        await user.selectOptions(getMemberSelect(), "m2");
        await user.click(screen.getByRole("button", { name: "Opprett Krav" }));

        expect(createFutureMonthlyFeesMock).toHaveBeenCalledWith(
            "m2",
            expect.any(Number),
            expect.any(Number),
            1
        );
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(openAlertMock).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Suksess", type: "success" })
        );
    });

    it("surfaces a failure from the server action without closing", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        createFutureMonthlyFeesMock.mockResolvedValueOnce({
            success: false,
            error: "Allerede opprettet"
        } as never);

        render(
            <CreateInvoiceModal isOpen={true} onClose={onClose} members={members} onSuccess={vi.fn()} />
        );

        await user.selectOptions(getMemberSelect(), "m1");
        await user.click(screen.getByRole("button", { name: "Opprett Krav" }));

        expect(openAlertMock).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Feil", message: "Allerede opprettet", type: "error" })
        );
        expect(onClose).not.toHaveBeenCalled();
    });

    it("renders nothing when closed", () => {
        const { container } = render(
            <CreateInvoiceModal isOpen={false} onClose={vi.fn()} members={[]} onSuccess={vi.fn()} />
        );
        expect(container).toBeEmptyDOMElement();
    });
});
