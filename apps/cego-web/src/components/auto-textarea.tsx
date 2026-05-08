"use client";

import { useEffect, useRef, useLayoutEffect } from "react";

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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new MutationObserver(() => resize(el));
    observer.observe(el, { attributes: true, attributeFilter: ["value"] });
    return () => observer.disconnect();
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
