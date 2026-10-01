from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from pathlib import Path
from collections import defaultdict, deque
import hashlib, hmac, json, mimetypes, os, re, secrets, sqlite3, time

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
DB_PATH = Path(os.environ.get("DAYQUEST_DB", DATA / "dayquest.db"))
PORT = int(os.environ.get("PORT", "8787"))
SESSION_DAYS = int(os.environ.get("SESSION_DAYS", "30"))
MAX_BODY = 2_000_000
PBKDF2_ROUNDS = 240_000
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
DEFAULT_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173", "capacitor://localhost", "http://localhost", "https://localhost"}
ALLOWED_ORIGINS = {x.strip() for x in os.environ.get("CORS_ORIGINS", "").split(",") if x.strip()} or DEFAULT_ORIGINS

# Prosty limiter wystarcza na lokalny/self-hosted backend. Przy publicznym wdrożeniu
# przenieś limitowanie do reverse proxy / Redis.
AUTH_HITS = defaultdict(deque)


def connect():
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    con.execute("PRAGMA journal_mode=WAL")
    return con


def init_db():
    con = connect()
    con.executescript("""
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions(
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS states(
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      payload TEXT NOT NULL,
      rev INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );
    """)
    con.commit(); con.close()


def password_hash(password: str, salt_hex: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), PBKDF2_ROUNDS).hex()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_session(con, user_id: int):
    raw = secrets.token_urlsafe(36)
    now = int(time.time())
    con.execute(
        "INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)",
        (token_hash(raw), user_id, now, now + SESSION_DAYS * 86400),
    )
    return raw


def public_user(row):
    return {"id": row["id"], "email": row["email"], "name": row["name"]}


class Handler(SimpleHTTPRequestHandler):
    server_version = "DayQuest/5"

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}")

    def cors_origin(self):
        origin = self.headers.get("Origin")
        return origin if origin in ALLOWED_ORIGINS else None

    def end_headers(self):
        origin = self.cors_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.end_headers()

    def send_json(self, obj, status=200):
        raw = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def read_json(self):
        try:
            n = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("Nieprawidłowy rozmiar żądania")
        if n <= 0 or n > MAX_BODY:
            raise ValueError("Żądanie jest puste albo za duże")
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception as exc:
            raise ValueError("Nieprawidłowy JSON") from exc

    def bearer(self):
        auth = self.headers.get("Authorization", "")
        return auth[7:].strip() if auth.startswith("Bearer ") else None

    def current_user(self):
        raw = self.bearer()
        if not raw:
            return None
        now = int(time.time())
        con = connect()
        row = con.execute(
            """SELECT users.id, users.email, users.name, sessions.expires_at
               FROM sessions JOIN users ON users.id=sessions.user_id
               WHERE sessions.token_hash=?""",
            (token_hash(raw),),
        ).fetchone()
        if row and row["expires_at"] <= now:
            con.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash(raw),))
            con.commit(); row = None
        con.close()
        return row

    def auth_limit_ok(self):
        ip = self.client_address[0]
        q = AUTH_HITS[ip]
        now = time.time()
        while q and q[0] < now - 600:
            q.popleft()
        if len(q) >= 20:
            return False
        q.append(now)
        return True

    def require_user(self):
        user = self.current_user()
        if not user:
            self.send_json({"error": "Brak autoryzacji"}, 401)
        return user

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            return self.send_json({"ok": True, "version": 5})
        if path == "/api/me":
            user = self.require_user()
            if not user: return
            return self.send_json({"user": public_user(user)})
        if path == "/api/state":
            user = self.require_user()
            if not user: return
            con = connect()
            row = con.execute("SELECT payload,rev,updated_at FROM states WHERE user_id=?", (user["id"],)).fetchone()
            con.close()
            if not row:
                return self.send_json({"state": None, "rev": 0, "updatedAt": None})
            return self.send_json({"state": json.loads(row["payload"]), "rev": row["rev"], "updatedAt": row["updated_at"]})
        if path.startswith("/api/"):
            return self.send_json({"error": "Nie znaleziono"}, 404)
        return self.serve_static(path)

    def do_POST(self):
        path = urlparse(self.path).path
        if path in ("/api/register", "/api/login") and not self.auth_limit_ok():
            return self.send_json({"error": "Za dużo prób. Spróbuj ponownie za kilka minut."}, 429)

        if path == "/api/register":
            try: data = self.read_json()
            except ValueError as e: return self.send_json({"error": str(e)}, 400)
            email = str(data.get("email", "")).strip().lower()
            password = str(data.get("password", ""))
            name = str(data.get("name", "")).strip()[:80] or "Użytkownik"
            if not EMAIL_RE.match(email) or len(email) > 254:
                return self.send_json({"error": "Podaj poprawny adres e-mail"}, 400)
            if len(password) < 6 or len(password) > 200:
                return self.send_json({"error": "Hasło musi mieć od 6 do 200 znaków"}, 400)
            salt = secrets.token_hex(16)
            ph = password_hash(password, salt)
            try:
                con = connect()
                cur = con.execute(
                    "INSERT INTO users(email,name,password_hash,salt,created_at) VALUES(?,?,?,?,?)",
                    (email, name, ph, salt, int(time.time())),
                )
                uid = cur.lastrowid
                raw = issue_session(con, uid)
                con.commit()
                row = con.execute("SELECT id,email,name FROM users WHERE id=?", (uid,)).fetchone()
                con.close()
            except sqlite3.IntegrityError:
                return self.send_json({"error": "Konto o tym e-mailu już istnieje"}, 409)
            return self.send_json({"token": raw, "user": public_user(row)}, 201)

        if path == "/api/login":
            try: data = self.read_json()
            except ValueError as e: return self.send_json({"error": str(e)}, 400)
            email = str(data.get("email", "")).strip().lower()
            password = str(data.get("password", ""))
            con = connect()
            row = con.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
            if not row or not hmac.compare_digest(password_hash(password, row["salt"]), row["password_hash"]):
                con.close()
                # stały-ish koszt hashowania utrudnia prosty timing leak
                if not row:
                    password_hash(password[:200], "00" * 16)
                return self.send_json({"error": "Nieprawidłowy e-mail lub hasło"}, 401)
            raw = issue_session(con, row["id"])
            con.commit(); con.close()
            return self.send_json({"token": raw, "user": public_user(row)})

        if path == "/api/logout":
            raw = self.bearer()
            if raw:
                con = connect(); con.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash(raw),)); con.commit(); con.close()
            return self.send_json({"ok": True})

        return self.send_json({"error": "Nie znaleziono"}, 404)

    def do_PUT(self):
        if urlparse(self.path).path != "/api/state":
            return self.send_json({"error": "Nie znaleziono"}, 404)
        user = self.require_user()
        if not user: return
        try: data = self.read_json()
        except ValueError as e: return self.send_json({"error": str(e)}, 400)
        state = data.get("state")
        if not isinstance(state, dict):
            return self.send_json({"error": "Stan aplikacji musi być obiektem"}, 400)
        try: base_rev = int(data.get("baseRev", 0))
        except (TypeError, ValueError): return self.send_json({"error": "Nieprawidłowa rewizja"}, 400)
        force = bool(data.get("force", False))
        payload = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
        if len(payload.encode("utf-8")) > MAX_BODY - 1000:
            return self.send_json({"error": "Stan aplikacji jest za duży"}, 413)

        con = connect()
        con.execute("BEGIN IMMEDIATE")
        current = con.execute("SELECT payload,rev,updated_at FROM states WHERE user_id=?", (user["id"],)).fetchone()
        current_rev = current["rev"] if current else 0
        if not force and base_rev != current_rev:
            con.rollback(); con.close()
            return self.send_json({
                "error": "Konflikt synchronizacji",
                "state": json.loads(current["payload"]) if current else None,
                "rev": current_rev,
                "updatedAt": current["updated_at"] if current else None,
            }, 409)
        new_rev = current_rev + 1
        now = int(time.time())
        con.execute(
            """INSERT INTO states(user_id,payload,rev,updated_at) VALUES(?,?,?,?)
               ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,rev=excluded.rev,updated_at=excluded.updated_at""",
            (user["id"], payload, new_rev, now),
        )
        con.commit(); con.close()
        return self.send_json({"ok": True, "rev": new_rev, "updatedAt": now})

    def do_DELETE(self):
        if urlparse(self.path).path != "/api/account":
            return self.send_json({"error": "Nie znaleziono"}, 404)
        user = self.require_user()
        if not user: return
        con = connect(); con.execute("DELETE FROM users WHERE id=?", (user["id"],)); con.commit(); con.close()
        return self.send_json({"ok": True})

    def serve_static(self, path):
        if not DIST.exists():
            return self.send_json({"error": "Frontend nie jest zbudowany. Uruchom npm run build."}, 503)
        rel = path.lstrip("/") or "index.html"
        target = (DIST / rel).resolve()
        try: target.relative_to(DIST.resolve())
        except ValueError: return self.send_json({"error": "Nie znaleziono"}, 404)
        if not target.exists() or not target.is_file():
            target = DIST / "index.html"
        raw = target.read_bytes()
        ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        if target.name == "index.html": self.send_header("Cache-Control", "no-cache")
        else: self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.end_headers(); self.wfile.write(raw)


if __name__ == "__main__":
    init_db()
    print(f"DayQuest 5 backend: http://localhost:{PORT}")
    if not DIST.exists(): print("Uwaga: brak dist/. Najpierw: npm run build")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
