"use client";

import { type ComponentPropsWithoutRef } from "react";
import { useConfirm } from "@/components/confirm-provider";

export default function ConfirmButton({
  message = "Are you sure?",
  ...props
}: ComponentPropsWithoutRef<"button"> & { message?: string }) {
  const confirm = useConfirm();

  return (
    <button
      {...props}
      onClick={async (e) => {
        const ok = await confirm(message);
        if (!ok) {
          e.preventDefault();
          return;
        }
        props.onClick?.(e);
      }}
    />
  );
}
