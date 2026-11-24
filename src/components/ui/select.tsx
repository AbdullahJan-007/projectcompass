"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

function extractTextFromNode(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join("");
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextFromNode(node.props.children);
  }
  return "";
}

function parseOptionChildren(children: React.ReactNode): ParsedOption[] {
  const options: ParsedOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child)) {
      return;
    }
    if (child.type === "option") {
      const label = extractTextFromNode(child.props.children).trim();
      const rawVal = child.props.value;
      const value = rawVal !== undefined ? String(rawVal) : label;
      options.push({
        value,
        label: label || value,
        disabled: Boolean(child.props.disabled),
      });
    }
  });
  return options;
}

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(
  (
    {
      className,
      children,
      value,
      defaultValue,
      onChange,
      disabled,
      name,
      id,
      "aria-label": ariaLabel,
    },
    _ref
  ) => {
    const listboxId = React.useId();
    const options = React.useMemo(() => parseOptionChildren(children), [children]);
    const [open, setOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState<string>(() => {
      if (value !== undefined) return String(value);
      if (defaultValue !== undefined) return String(defaultValue);
      return options[0]?.value ?? "";
    });
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    const activeValue = value !== undefined ? String(value) : internalValue;
    const selectedOption =
      options.find((o) => o.value === activeValue) ?? options[0] ?? null;

    React.useEffect(() => {
      if (!open) return;
      function handleOutside(event: MouseEvent) {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setOpen(false);
        }
      }
      function handleEscape(event: KeyboardEvent) {
        if (event.key === "Escape") {
          setOpen(false);
        }
      }
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }, [open]);

    function handleSelectValue(nextValue: string) {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      setOpen(false);
      if (onChange) {
        const syntheticEvent = {
          target: { value: nextValue, name: name ?? "" },
          currentTarget: { value: nextValue, name: name ?? "" },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
    }

    return (
      <div ref={containerRef} className={cn("relative w-full", className)}>
        {name && <input type="hidden" name={name} value={activeValue} />}
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-[8px] border border-border-strong bg-bg-surface px-3 text-left text-sm text-text-primary transition-colors hover:border-brand-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate leading-normal">
            {selectedOption ? selectedOption.label : activeValue}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-text-muted transition-transform duration-150",
              open && "rotate-180 text-brand-primary"
            )}
            strokeWidth={1.75}
          />
        </button>

        {open && options.length > 0 && (
          <div
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-y-auto rounded-[8px] border border-border-default bg-bg-surface p-1 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12),0_4px_10px_-4px_rgba(15,23,42,0.08)]"
          >
            {options.map((opt) => {
              const isSelected = opt.value === activeValue;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onClick={() => handleSelectValue(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[6px] px-2.5 py-2 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-brand-tint/60 font-medium text-brand-primary-hover"
                      : "text-text-primary hover:bg-bg-subtle",
                    opt.disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-brand-primary"
                      strokeWidth={2}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
