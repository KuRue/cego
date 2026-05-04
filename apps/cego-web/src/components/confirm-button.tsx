"use client";

import { type ComponentPropsWithoutRef } from "react";

export default function ConfirmButton({
  message = "Are you sure?",
  ...props
}: ComponentPropsWithoutRef<"button"> & { message?: string }) {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
          return;
        }
        props.onClick?.(e);
      }}
    />
  );
}
