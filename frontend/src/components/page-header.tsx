import type React from "react";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        {eyebrow ? <div className="mb-2 text-xs font-semibold uppercase text-[#2563eb]">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold text-[#111827]">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-[#667085]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
