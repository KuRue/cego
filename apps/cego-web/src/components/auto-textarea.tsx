"use client";

import { useRef, useLayoutEffect } from "react";

export default function AutoTextarea({
  defaultValue,
  placeholder,
  name,
  className,
}: {
  defaultValue?: string;
  placeholder?: string;
  name: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  useLayoutEffect(() => {
    if (ref.current) resize(ref.current);
  }, []);

  return (
    <textarea
      ref={ref}
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={className}
      rows={1}
      onInput={(e) => resize(e.currentTarget)}
    />
  );
}
