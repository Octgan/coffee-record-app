"use client";

import Link from "next/link";

type OpenDripTimerButtonProps = {
  href: string;
  onClick?: () => void;
  className?: string;
  label?: string;
};

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 1.5" />
      <path d="M9 3h6" />
      <path d="M12 3v2" />
    </svg>
  );
}

export function DripTimerLaunchSection({
  timerHref,
  onPrepare,
  totalBrewTimeSec
}: {
  timerHref: string;
  onPrepare?: () => void;
  totalBrewTimeSec: string;
}) {
  return (
    <section
      className="my-6 rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50/95 via-white to-amber-100/50 p-5 shadow-sm sm:p-6"
      aria-label="ドリップタイマー"
    >
      <p className="text-center text-sm leading-relaxed text-amber-900/80 sm:text-left">
        湯量の準備ができたら、タイマーで各投のタイミングをナビしながら抽出できます。
      </p>
      <div className="mt-4 flex flex-col items-center gap-3 sm:items-start">
        <OpenDripTimerButton href={timerHref} onClick={onPrepare} />
        {totalBrewTimeSec.trim() !== "" && (
          <p className="text-sm text-amber-900">
            <span className="font-semibold">計測済みの抽出時間:</span>{" "}
            <span className="tabular-nums">{totalBrewTimeSec} 秒</span>
          </p>
        )}
      </div>
    </section>
  );
}

export default function OpenDripTimerButton({
  href,
  onClick,
  className = "",
  label = "ドリップタイマーを開く"
}: OpenDripTimerButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-amber-700/80 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 px-6 py-4 text-base font-bold tracking-wide text-white shadow-lg shadow-amber-900/25 transition duration-150 ease-out hover:from-amber-600 hover:via-amber-700 hover:to-amber-800 hover:shadow-xl hover:shadow-amber-900/30 active:scale-[0.97] active:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 sm:w-auto sm:min-w-[17rem] ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 transition group-active:scale-95">
        <TimerIcon className="h-5 w-5" />
      </span>
      <span>{label}</span>
    </Link>
  );
}
