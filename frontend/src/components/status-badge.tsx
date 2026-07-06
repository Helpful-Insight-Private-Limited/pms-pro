import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  ACTIVE: "border-[#9fc0ff] bg-[#eaf1ff] text-[#174ea6]",
  COMPLETED: "border-[#a8dcc1] bg-[#eef9f2] text-[#137333]",
  IN_PROGRESS: "border-[#9fc0ff] bg-[#eaf1ff] text-[#174ea6]",
  TODO: "border-[#d7dde8] bg-white text-[#667085]",
  REVIEW: "border-[#f4c430] bg-[#fff5cc] text-[#7a5a00]",
  TESTING: "border-[#f4c430] bg-[#fff5cc] text-[#7a5a00]",
  BLOCKED: "border-[#f2aaa5] bg-[#fff0ee] text-[#b42318]",
  DELAYED: "border-[#f2aaa5] bg-[#fff0ee] text-[#b42318]",
  ON_HOLD: "border-[#d7dde8] bg-[#f4f7fb] text-[#475467]",
  HOLD: "border-[#d7dde8] bg-[#f4f7fb] text-[#475467]",
  DRAFT: "border-[#d7dde8] bg-white text-[#667085]",
  INVITED: "border-[#f4c430] bg-[#fff5cc] text-[#7a5a00]",
  SUSPENDED: "border-[#f2aaa5] bg-[#fff0ee] text-[#b42318]",
  DEACTIVATED: "border-[#d7dde8] bg-[#f4f7fb] text-[#475467]"
};

export function StatusBadge({ value, className }: { value?: string | null; className?: string }) {
  const label = value ? value.replaceAll("_", " ") : "Unknown";
  return (
    <span className={cn("inline-flex h-7 items-center rounded-md border px-2 text-xs font-semibold", toneMap[value ?? ""] ?? "border-[#d7dde8] bg-white text-[#475467]", className)}>
      {label}
    </span>
  );
}
