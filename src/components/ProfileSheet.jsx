import { useEffect, useState } from "react";
import {
  Cloud, CloudOff, CloudUpload, Download, LogIn, LogOut, RefreshCw,
  ShieldCheck, Trash2, UserRound, X,
} from "lucide-react";
import { Button3D } from "./ui/Button3D";

const inputCls = "mt-1 w-full rounded-2xl border-2 border-b-4 border-slate-200 px-3 py-2.5 font-bold text-slate-800 placeholder:font-semibold placeholder:text-slate-300 focus:border-lime-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

function Status({ cloud }) {
  const map = {
    local: [CloudOff, "Tylko na tym urządzeniu", "text-slate-400"],
    connecting: [RefreshCw, "Łączenie…", "text-sky-500"],
    syncing: [RefreshCw, "Synchronizacja…", "text-sky-500"],
    synced: [Cloud, "Chmura aktualna", "text-lime-500"],
    offline: [CloudOff, "Offline — zapis lokalny działa", "text-amber-500"],
    conflict: [CloudOff, "Konflikt danych", "text-rose-500"],
  };
  const [Icon, label, color] = map[cloud.status] || map.local;
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <Icon className={`h-4 w-4 stroke-[2.5] ${color} ${cloud.status === "syncing" || cloud.status === "connecting" ? "animate-spin" : ""}`} />
      <span className="text-xs font-black text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  );
}

export function ProfileSheet({
  cloud,
  onClose,
  onLogin,
  onRegister,
  onLogout,
  onPull,
  onPush,
  onDeleteAccount,
}) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cloud.user?.email) setEmail(cloud.user.email);
  }, [cloud.user?.email]);

  const submit = async () => {
    if (!email.trim() || password.length < 6) return;
    setBusy(true);
    try {
      if (mode === "register") await onRegister({ email: email.trim(), password, name: name.trim() });
      else await onLogin({ email: email.trim(), password });
      setPassword("");
    } catch {
      // Komunikat pokazuje warstwa aplikacji; tutaj tylko zatrzymujemy stan ładowania.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="dq-rise relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t-4 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:border-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">DayQuest Cloud</p>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Konto i synchronizacja</h3>
          </div>
          <button onClick={onClose} aria-label="Zamknij" className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-700 dark:text-slate-300">
            <X className="h-5 w-5 stroke-[3]" />
          </button>
        </div>

        <Status cloud={cloud} />

        {cloud.user ? (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-3xl border-2 border-b-4 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-500 text-white">
                <UserRound className="h-6 w-6 stroke-[3]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-slate-800 dark:text-slate-100">{cloud.user.name || "Użytkownik"}</p>
                <p className="truncate text-xs font-bold text-slate-400 dark:text-slate-500">{cloud.user.email}</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-lime-500" />
            </div>

            {cloud.status === "conflict" && (
              <div className="mt-4 rounded-3xl border-2 border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950">
                <p className="font-black text-rose-700 dark:text-rose-300">Dwa urządzenia zmieniły dane jednocześnie.</p>
                <p className="mt-1 text-sm font-semibold text-rose-500 dark:text-rose-400">Nic nie nadpisuję bez Twojej decyzji.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button3D variant="ghost" onClick={onPull}><span className="flex items-center justify-center gap-1.5"><Download className="h-4 w-4" /> Pobierz</span></Button3D>
                  <Button3D onClick={onPush}><span className="flex items-center justify-center gap-1.5"><CloudUpload className="h-4 w-4" /> Wyślij moje</span></Button3D>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-3xl border-2 border-slate-200 p-4 dark:border-slate-700">
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">Jak działa synchronizacja</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400 dark:text-slate-500">Telefon zawsze zapisuje lokalnie. Po zalogowaniu zmiany lecą również do serwera. Gdy serwer wykryje równoczesną edycję na innym urządzeniu, zatrzymuje nadpisanie i pokazuje konflikt.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button3D variant="ghost" onClick={onPull}><span className="flex items-center justify-center gap-1.5"><Download className="h-4 w-4" /> Z chmury</span></Button3D>
                <Button3D variant="ghost" onClick={onPush}><span className="flex items-center justify-center gap-1.5"><CloudUpload className="h-4 w-4" /> Do chmury</span></Button3D>
              </div>
            </div>

            <Button3D variant="ghost" className="mt-4 w-full" onClick={onLogout}>
              <span className="flex items-center justify-center gap-2"><LogOut className="h-4 w-4" /> Wyloguj</span>
            </Button3D>
            <button onClick={onDeleteAccount} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-rose-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-300">
              <Trash2 className="h-4 w-4" /> Usuń konto i dane z chmury
            </button>
          </>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
              <button onClick={() => setMode("login")} className={`rounded-xl px-3 py-2 text-sm font-black ${mode === "login" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-400"}`}>Logowanie</button>
              <button onClick={() => setMode("register")} className={`rounded-xl px-3 py-2 text-sm font-black ${mode === "register" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-400"}`}>Nowe konto</button>
            </div>
            {mode === "register" && <label className="mt-4 block text-xs font-black uppercase tracking-widest text-slate-400">Nazwa<input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Kuba" /></label>}
            <label className="mt-4 block text-xs font-black uppercase tracking-widest text-slate-400">E-mail<input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoCapitalize="none" placeholder="ty@example.com" /></label>
            <label className="mt-3 block text-xs font-black uppercase tracking-widest text-slate-400">Hasło<input className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="minimum 6 znaków" /></label>
            <Button3D className="mt-4 w-full" disabled={busy || !email.trim() || password.length < 6} onClick={submit}>
              <span className="flex items-center justify-center gap-2">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}{mode === "register" ? "Utwórz konto" : "Zaloguj"}</span>
            </Button3D>
            <p className="mt-3 text-center text-xs font-semibold leading-relaxed text-slate-400">Konto jest opcjonalne. Bez niego DayQuest nadal działa całkowicie lokalnie.</p>
          </>
        )}
      </div>
    </div>
  );
}
