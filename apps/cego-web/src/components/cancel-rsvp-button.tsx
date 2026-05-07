"use client";

import { type ComponentPropsWithoutRef } from "react";
import ConfirmButton from "@/components/confirm-button";

export default function CancelRsvpButton(
  props: ComponentPropsWithoutRef<"button"> & { message?: string },
) {
  return <ConfirmButton message={props.message ?? "Are you sure you want to cancel your RSVP?"} {...props} />;
}
