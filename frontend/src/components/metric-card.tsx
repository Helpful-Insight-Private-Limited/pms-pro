import { cn } from "@/lib/utils";

export function MetricCard({ label, value, tone = "blue", detail }: { label: string; value: string | number; tone?: "blue" | "green" | "red" | "gray" | "yellow" | "black"; detail?: string }) {
  const tones = {
    blue: "border-[#b8cdf8] bg-white shadow-sm",
    green: "border-[#a7dfc0] bg-white shadow-sm",
    red: "border-[#f3b4b4] bg-white shadow-sm",
    gray: "border-[#d7dde8] bg-white shadow-sm",
    yellow: "border-[#f4c430] bg-white shadow-sm",
    black: "border-[#111827] bg-[#111827] shadow-sm"
  };

  return (
    <div className={cn("rounded-md border p-4", tones[tone])}>
      <div className="flex items-center justify-between gap-3">
        <div className={cn("text-sm", tone === "black" ? "text-white/65" : "text-[#667085]")}>{label}</div>
        <span className={cn("h-2 w-2 rounded-full", tone === "yellow" ? "bg-[#f4c430]" : tone === "red" ? "bg-[#dc2626]" : tone === "black" ? "bg-[#f4c430]" : "bg-[#2563eb]")} />
      </div>
      <div className={cn("mt-2 text-2xl font-semibold", tone === "black" ? "text-white" : "text-[#111827]")}>{value}</div>
      {detail ? <div className={cn("mt-2 text-xs", tone === "black" ? "text-white/55" : "text-[#667085]")}>{detail}</div> : null}
    </div>
  );
}
