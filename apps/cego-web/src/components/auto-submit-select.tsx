"use client";

import { useTransition } from "react";

export default function AutoSubmitSelect({
  ...props
}: React.ComponentPropsWithoutRef<"select">) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      {...props}
      disabled={pending}
      onChange={(e) => {
        props.onChange?.(e);
        startTransition(() => {
          (e.target.form as HTMLFormElement).requestSubmit();
        });
      }}
    />
  );
}
