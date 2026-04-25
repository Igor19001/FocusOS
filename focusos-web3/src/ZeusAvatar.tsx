export type ZeusAvatarState = "neutral" | "proud" | "disappointed" | "wrath" | "tired";

type ZeusAvatarProps = {
  state: ZeusAvatarState;
  size?: number;
  className?: string;
};

const stateConfig: Record<
  ZeusAvatarState,
  {
    browLeft: string;
    browRight: string;
    mouth: string;
    eyeOpacity: number;
    auraOpacity: number;
    lightningOpacity: number;
    goldOpacity: number;
    faceShadow: string;
    label: string;
  }
> = {
  neutral: {
    browLeft: "M150 188 Q183 177 216 184",
    browRight: "M296 184 Q329 177 362 188",
    mouth: "M228 330 Q256 338 284 330",
    eyeOpacity: 0.52,
    auraOpacity: 0.42,
    lightningOpacity: 0,
    goldOpacity: 0,
    faceShadow: "rgba(56, 189, 248, 0.2)",
    label: "Neutral",
  },
  proud: {
    browLeft: "M150 186 Q183 176 216 182",
    browRight: "M296 182 Q329 176 362 186",
    mouth: "M226 326 Q256 347 286 326",
    eyeOpacity: 0.9,
    auraOpacity: 0.62,
    lightningOpacity: 0.05,
    goldOpacity: 0.42,
    faceShadow: "rgba(251, 191, 36, 0.22)",
    label: "Proud",
  },
  disappointed: {
    browLeft: "M150 190 Q183 184 216 192",
    browRight: "M296 192 Q329 184 362 190",
    mouth: "M226 338 Q256 325 286 338",
    eyeOpacity: 0.28,
    auraOpacity: 0.24,
    lightningOpacity: 0,
    goldOpacity: 0,
    faceShadow: "rgba(15, 23, 42, 0.42)",
    label: "Disappointed",
  },
  wrath: {
    browLeft: "M150 199 Q183 168 216 174",
    browRight: "M296 174 Q329 168 362 199",
    mouth: "M220 335 Q256 346 292 335",
    eyeOpacity: 1,
    auraOpacity: 0.9,
    lightningOpacity: 0.92,
    goldOpacity: 0,
    faceShadow: "rgba(14, 165, 233, 0.38)",
    label: "Wrath",
  },
  tired: {
    browLeft: "M150 190 Q183 186 216 190",
    browRight: "M296 190 Q329 186 362 190",
    mouth: "M228 333 Q256 331 284 333",
    eyeOpacity: 0.34,
    auraOpacity: 0.18,
    lightningOpacity: 0,
    goldOpacity: 0,
    faceShadow: "rgba(71, 85, 105, 0.3)",
    label: "Tired",
  },
};

export const zeusAvatarStates = Object.keys(stateConfig) as ZeusAvatarState[];

export default function ZeusAvatar({ state, size = 160, className = "" }: ZeusAvatarProps) {
  const config = stateConfig[state];

  return (
    <div
      className={`overflow-hidden rounded-[28px] border border-cyan-300/15 bg-slate-950/70 ${className}`.trim()}
      style={{ width: size, height: size, boxShadow: `0 0 40px ${config.faceShadow}` }}
    >
      <svg viewBox="0 0 512 512" role="img" aria-label={`Zeus avatar ${config.label}`}>
        <defs>
          <radialGradient id={`bg-${state}`} cx="50%" cy="36%" r="72%">
            <stop offset="0%" stopColor="#0f2740" />
            <stop offset="58%" stopColor="#08111f" />
            <stop offset="100%" stopColor="#02050b" />
          </radialGradient>
          <radialGradient id={`aura-${state}`} cx="50%" cy="28%" r="46%">
            <stop offset="0%" stopColor={`rgba(74, 222, 255, ${config.auraOpacity})`} />
            <stop offset="100%" stopColor="rgba(74, 222, 255, 0)" />
          </radialGradient>
          <radialGradient id={`gold-${state}`} cx="50%" cy="16%" r="46%">
            <stop offset="0%" stopColor={`rgba(250, 204, 21, ${config.goldOpacity})`} />
            <stop offset="100%" stopColor="rgba(250, 204, 21, 0)" />
          </radialGradient>
          <linearGradient id={`skin-${state}`} x1="30%" y1="10%" x2="65%" y2="100%">
            <stop offset="0%" stopColor="#f4d8bc" />
            <stop offset="45%" stopColor="#dab18c" />
            <stop offset="100%" stopColor="#8b6046" />
          </linearGradient>
          <linearGradient id={`hair-${state}`} x1="30%" y1="0%" x2="72%" y2="100%">
            <stop offset="0%" stopColor="#f7fbff" />
            <stop offset="55%" stopColor="#d7e2f0" />
            <stop offset="100%" stopColor="#92a6bc" />
          </linearGradient>
          <linearGradient id={`robe-${state}`} x1="18%" y1="0%" x2="82%" y2="100%">
            <stop offset="0%" stopColor="#0a1d30" />
            <stop offset="100%" stopColor="#07101d" />
          </linearGradient>
          <filter id={`eyeGlow-${state}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={state === "wrath" ? "8" : "5"} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`soft-${state}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <rect width="512" height="512" fill={`url(#bg-${state})`} />
        <circle cx="256" cy="168" r="180" fill={`url(#aura-${state})`} />
        <circle cx="256" cy="112" r="162" fill={`url(#gold-${state})`} />

        <g opacity={config.lightningOpacity}>
          <path d="M110 78 L178 126 L152 176 L220 210 L182 284" fill="none" stroke="#52dcff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M408 92 L344 142 L366 192 L314 220 L344 284" fill="none" stroke="#52dcff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="132" cy="70" r="22" fill="rgba(82, 220, 255, 0.18)" filter={`url(#soft-${state})`} />
          <circle cx="386" cy="88" r="26" fill="rgba(82, 220, 255, 0.2)" filter={`url(#soft-${state})`} />
        </g>

        <path d="M115 468 C148 381 187 338 256 334 C327 338 367 381 398 468 Z" fill={`url(#robe-${state})`} />
        <path d="M208 355 C224 386 287 386 304 355" fill="none" stroke="rgba(77, 208, 255, 0.3)" strokeWidth="4" />

        <g>
          <path
            d="M141 175 C152 99 212 57 256 57 C300 57 360 99 371 175 C382 255 346 365 256 365 C166 365 130 255 141 175 Z"
            fill={`url(#skin-${state})`}
          />
          <path d="M179 192 C198 171 226 164 256 164 C286 164 314 171 333 192" fill="none" stroke="rgba(26, 38, 53, 0.34)" strokeWidth="10" strokeLinecap="round" />
          <path d={config.browLeft} fill="none" stroke="#ecf7ff" strokeWidth="10" strokeLinecap="round" />
          <path d={config.browRight} fill="none" stroke="#ecf7ff" strokeWidth="10" strokeLinecap="round" />
          <ellipse cx="194" cy={state === "tired" ? 241 : 235} rx="40" ry={state === "tired" ? 16 : 20} fill="#09233f" />
          <ellipse cx="318" cy={state === "tired" ? 241 : 235} rx="40" ry={state === "tired" ? 16 : 20} fill="#09233f" />
          <ellipse cx="194" cy={state === "tired" ? 241 : 235} rx="26" ry={state === "tired" ? 10 : 12} fill={`rgba(82, 220, 255, ${config.eyeOpacity})`} filter={`url(#eyeGlow-${state})`} />
          <ellipse cx="318" cy={state === "tired" ? 241 : 235} rx="26" ry={state === "tired" ? 10 : 12} fill={`rgba(82, 220, 255, ${config.eyeOpacity})`} filter={`url(#eyeGlow-${state})`} />
          <circle cx="194" cy={state === "tired" ? 237 : 232} r="6" fill="#defdff" opacity={Math.min(1, config.eyeOpacity + 0.15)} />
          <circle cx="318" cy={state === "tired" ? 237 : 232} r="6" fill="#defdff" opacity={Math.min(1, config.eyeOpacity + 0.15)} />
          <path d="M254 220 C245 256 239 283 232 307 C244 311 267 311 280 307" fill="none" stroke="rgba(120, 74, 46, 0.7)" strokeWidth="7" strokeLinecap="round" />
          <path d={config.mouth} fill="none" stroke="#5e2d20" strokeWidth="8" strokeLinecap="round" />
          <path d="M209 322 C225 360 288 360 304 322" fill="none" stroke="#e7eef7" strokeWidth="18" strokeLinecap="round" />
          <path d="M210 323 C214 372 242 408 256 424 C270 408 298 372 302 323" fill="#d9e4ef" opacity="0.92" />
          <path d="M172 164 C172 129 206 88 256 85 C306 88 340 129 340 164 C349 134 336 78 297 53 C281 43 267 40 256 40 C245 40 231 43 215 53 C176 78 163 134 172 164 Z" fill={`url(#hair-${state})`} />
          <path d="M154 173 C154 121 174 84 211 52 C196 95 195 142 203 174 Z" fill={`url(#hair-${state})`} />
          <path d="M358 173 C358 121 338 84 301 52 C316 95 317 142 309 174 Z" fill={`url(#hair-${state})`} />
          <path d="M126 217 C118 183 122 151 142 123 C145 152 150 186 162 216 Z" fill={`url(#hair-${state})`} />
          <path d="M386 217 C394 183 390 151 370 123 C367 152 362 186 350 216 Z" fill={`url(#hair-${state})`} />
          <path d="M175 311 C187 357 223 394 256 409 C289 394 325 357 337 311 C327 326 313 338 295 347 C280 354 268 356 256 356 C244 356 232 354 217 347 C199 338 185 326 175 311 Z" fill="rgba(9, 35, 63, 0.16)" />
          <path d="M182 179 C184 142 215 116 256 116 C297 116 328 142 330 179" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="6" strokeLinecap="round" />
        </g>

        <rect width="512" height="512" fill="rgba(7, 16, 29, 0.12)" />
      </svg>
    </div>
  );
}
