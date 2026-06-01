"use client";

import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "../controls/Button";

/**
 * Replaces ad-hoc `window.confirm()` calls. Built on `Modal` so the visual
 * matches every other dialog in the product.
 *
 *   <ConfirmDialog
 *     open={pendingDelete !== null}
 *     onConfirm={doDelete}
 *     onCancel={() => setPendingDelete(null)}
 *     title="Delete resource"
 *     body={`This will permanently remove "${pendingDelete?.title}".`}
 *     destructive
 *     confirmLabel="Delete"
 *   />
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** Renders the confirm button in danger style. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth={440}>
      {body ? (
        <div
          style={{
            padding: "12px 20px 0",
            color: "var(--text-2)",
            fontSize: 14,
            lineHeight: 1.55
          }}
        >
          {body}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
          padding: "18px 20px",
          marginTop: 12,
          borderTop: "1px solid var(--border)"
        }}
      >
        <Button intent="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          intent={destructive ? "secondary" : "primary"}
          onClick={onConfirm}
          style={
            destructive
              ? {
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.35)"
                }
              : undefined
          }
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
