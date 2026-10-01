const VARIANTS = {
  primary: "bg-lime-500 border-lime-700 text-white hover:bg-lime-400",
  gold: "bg-yellow-400 border-yellow-600 text-yellow-950 hover:bg-yellow-300",
  ghost:
    "bg-white border-slate-300 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700",
  danger: "bg-rose-500 border-rose-700 text-white hover:bg-rose-400",
};

export function Button3D({ variant = "primary", className = "", children, ...props }) {
  return (
    <button
      {...props}
      className={[
        "select-none rounded-2xl border-b-4 px-5 py-3 text-sm font-extrabold uppercase tracking-wide",
        "transition-all duration-100 active:translate-y-1 active:border-b-0",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300",
        "disabled:pointer-events-none disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400",
        "dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-600",
        VARIANTS[variant],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, activeClass = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border-2 border-b-4 px-3 py-2 text-xs font-extrabold transition-all duration-100",
        "active:translate-y-0.5 active:border-b-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300",
        active
          ? `text-white ${activeClass}`
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
