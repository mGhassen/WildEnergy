"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useAdjustMemberCredit,
  useMemberCredit,
  useUpdateMemberCreditEntry,
  type CreditEntry,
} from "@/hooks/useMemberCredit";
import { formatCurrency } from "@/lib/config";
import { formatDate } from "@/lib/date";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  Minus,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ManageCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function entryLabel(entry: CreditEntry): string {
  switch (entry.entryType) {
    case "manual_add":
      return "Credit added";
    case "manual_remove":
      return "Credit removed";
    case "payment_use":
      return "Used for payment";
    case "payment_excess":
      return "Overpayment credit";
    case "payment_reversal":
      return "Payment reversal";
    case "initial":
      return "Initial credit";
    case "opening_balance":
      return "Opening balance";
    default:
      return "Credit change";
  }
}

function EntryRow({
  entry,
  onUpdate,
  isUpdating,
}: {
  entry: CreditEntry;
  onUpdate?: (
    entryId: number,
    patch: { entryDate: string; amount: number; notes: string }
  ) => Promise<void>;
  isUpdating?: boolean;
}) {
  const isCredit = entry.amount > 0;
  const canEdit = entry.entryType === "manual_add" && !!onUpdate;
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState(entry.entryDate);
  const [draftAmount, setDraftAmount] = useState(String(entry.amount));
  const [draftNotes, setDraftNotes] = useState(entry.notes || "");

  useEffect(() => {
    if (!editing) {
      setDraftDate(entry.entryDate);
      setDraftAmount(String(Math.abs(entry.amount)));
      setDraftNotes(entry.notes || "");
    }
  }, [entry.entryDate, entry.amount, entry.notes, editing]);

  const handleSave = async () => {
    const parsed = parseFloat(draftAmount);
    if (!onUpdate || !draftDate || !Number.isFinite(parsed) || parsed <= 0) return;

    const nextNotes = draftNotes.trim();
    const unchanged =
      draftDate === entry.entryDate &&
      parsed === Math.abs(entry.amount) &&
      nextNotes === (entry.notes || "").trim();
    if (unchanged) {
      setEditing(false);
      return;
    }

    try {
      await onUpdate(entry.id, {
        entryDate: draftDate,
        amount: parsed,
        notes: nextNotes,
      });
      setEditing(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isCredit
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        )}
      >
        {isCredit ? (
          <ArrowDownLeft className="h-4 w-4" />
        ) : (
          <ArrowUpRight className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-none">{entryLabel(entry)}</p>
            {editing ? (
              <div className="mt-1.5 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={draftAmount}
                    onChange={(e) => setDraftAmount(e.target.value)}
                    className="h-8 w-24 text-xs"
                    disabled={isUpdating}
                  />
                  <Input
                    type="date"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    className="h-8 w-auto text-xs"
                    disabled={isUpdating}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleSave}
                    disabled={
                      isUpdating ||
                      !draftDate ||
                      !draftAmount ||
                      parseFloat(draftAmount) <= 0
                    }
                  >
                    {isUpdating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setDraftDate(entry.entryDate);
                      setDraftAmount(String(Math.abs(entry.amount)));
                      setDraftNotes(entry.notes || "");
                      setEditing(false);
                    }}
                    disabled={isUpdating}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  placeholder="Notes (optional)"
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  className="text-xs"
                  disabled={isUpdating}
                />
              </div>
            ) : (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <span>
                  {formatDate(entry.entryDate)}
                  {entry.createdBy ? ` · ${entry.createdBy}` : ""}
                </span>
                {canEdit ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => setEditing(true)}
                    title="Edit amount, date, and notes"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                ) : null}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                isCredit ? "text-emerald-600" : "text-red-600"
              )}
            >
              {isCredit ? "+" : ""}
              {formatCurrency(entry.amount)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              Bal. {formatCurrency(entry.balanceAfter)}
            </p>
          </div>
        </div>
        {!editing && entry.notes ? (
          <p className="text-xs text-muted-foreground line-clamp-2">{entry.notes}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ManageCreditDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
}: ManageCreditDialogProps) {
  const { data, isLoading, isFetching } = useMemberCredit(memberId, open);
  const adjustMutation = useAdjustMemberCredit(memberId);
  const updateEntryMutation = useUpdateMemberCreditEntry(memberId);

  const [action, setAction] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(todayKey());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setAction("add");
      setAmount("");
      setEntryDate(todayKey());
      setNotes("");
    }
  }, [open]);

  const credit = data?.credit ?? 0;
  const debit = data?.debit ?? 0;
  const entries = data?.entries ?? [];

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, CreditEntry[]>();
    for (const entry of entries) {
      const key = entry.entryDate;
      const list = groups.get(key) || [];
      list.push(entry);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [entries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    try {
      await adjustMutation.mutateAsync({
        amount: parsed,
        action,
        entryDate,
        notes: notes.trim() || undefined,
      });
      setAmount("");
      setNotes("");
      setEntryDate(todayKey());
      setAction("add");
    } catch {
      // toast handled in hook
    }
  };

  const handleUpdateEntry = async (
    entryId: number,
    patch: { entryDate: string; amount: number; notes: string }
  ) => {
    await updateEntryMutation.mutateAsync({
      entryId,
      entryDate: patch.entryDate,
      amount: patch.amount,
      notes: patch.notes,
    });
  };

  const handleClose = (nextOpen: boolean) => {
    if (adjustMutation.isPending || updateEntryMutation.isPending) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Manage Credit
          </DialogTitle>
          <DialogDescription>
            Add or remove wallet credit for {memberName}. Changes are recorded in history by date.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Credit
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
                {isLoading ? "—" : formatCurrency(credit)}
              </p>
            </div>
            <div className="border-l pl-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Debit due
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-600">
                {isLoading ? "—" : formatCurrency(debit)}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={action === "add" ? "default" : "outline"}
              onClick={() => setAction("add")}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add credit
            </Button>
            <Button
              type="button"
              size="sm"
              variant={action === "remove" ? "destructive" : "outline"}
              onClick={() => setAction("remove")}
              className="flex-1"
            >
              <Minus className="h-4 w-4 mr-1.5" />
              Remove credit
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount</Label>
              <Input
                id="credit-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-date">Date</Label>
              <Input
                id="credit-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit-notes">Notes (optional)</Label>
            <Textarea
              id="credit-notes"
              rows={2}
              placeholder="Reason for this credit change…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={adjustMutation.isPending || !amount || parseFloat(amount) <= 0}
          >
            {adjustMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : action === "add" ? (
              <Plus className="h-4 w-4 mr-2" />
            ) : (
              <Minus className="h-4 w-4 mr-2" />
            )}
            {action === "add" ? "Add to balance" : "Remove from balance"}
          </Button>
        </form>

        <Separator />

        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Credit history
          </h3>
          {isFetching && !isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Badge variant="secondary" className="text-xs">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[280px] px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading history…
            </div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No credit history yet. Add credit above to start the ledger.
            </div>
          ) : (
            <div className="pb-4">
              {groupedEntries.map(([date, dayEntries]) => (
                <div key={date} className="mb-2">
                  <p className="sticky top-0 z-10 bg-background/95 backdrop-blur py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {formatDate(date)}
                  </p>
                  <div className="divide-y">
                    {dayEntries.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        onUpdate={handleUpdateEntry}
                        isUpdating={
                          updateEntryMutation.isPending &&
                          updateEntryMutation.variables?.entryId === entry.id
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={adjustMutation.isPending || updateEntryMutation.isPending}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
