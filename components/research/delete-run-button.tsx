"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteRun } from "@/lib/actions/research";
import { Button } from "@/components/ui/button";

export function DeleteRunButton({ runId }: { runId: string }) {
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (!window.confirm("Delete this research run and its data? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteRun(runId);
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={pending}
      aria-label="Delete run"
      className="shrink-0 text-slate-400 hover:text-red-600"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
