import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: { landingDescription: "Choose Local Demo or Monad wallet mode.", localDemo: "Local Demo", connectMonad: "Connect Monad Wallet", liveLogPlaceholder: "Type live note/task while timer runs..." } },
    pl: { translation: { landingDescription: "Wybierz tryb lokalny lub portfel Monad.", localDemo: "Demo lokalne", connectMonad: "Połącz portfel Monad", liveLogPlaceholder: "Wpisz notatkę/zadanie podczas działania timera..." } },
    es: { translation: { landingDescription: "Elige modo local o cartera Monad.", localDemo: "Demostración local", connectMonad: "Conectar cartera Monad", liveLogPlaceholder: "Escribe nota/tarea en vivo mientras corre el temporizador..." } }
  },
});

export default i18n;
