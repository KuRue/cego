"use client";

import { type ComponentPropsWithoutRef } from "react";

export default function CancelRsvpButton(
  props: ComponentPropsWithoutRef<"button">,
) {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!confirm("Are you sure you want to cancel your RSVP?")) {
          e.preventDefault();
          return;
        }
        props.onClick?.(e);
      }}
    />
  );
}
