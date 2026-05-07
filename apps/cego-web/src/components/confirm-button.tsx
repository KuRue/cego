"use client";

import { type ComponentPropsWithoutRef, useRef } from "react";
import { useConfirm } from "@/components/confirm-provider";

export default function ConfirmButton({
  message = "Are you sure?",
  ...props
}: ComponentPropsWithoutRef<"button"> & { message?: string }) {
  const confirm = useConfirm();
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      {...props}
      ref={ref}
      onClick={async (e) => {
        e.preventDefault();
        const ok = await confirm(message);
        if (ok) {
          ref.current?.form?.requestSubmit(ref.current);
        }
      }}
    />
  );
}
