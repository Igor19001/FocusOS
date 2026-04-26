import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        landingDescription: "Choose how to enter FocusOS: local demo, wallet, Gmail, or GitHub.",
        localDemo: "Local Demo",
        connectMonad: "Connect Monad Wallet",
        liveLogPlaceholder: "Type live note/task while timer runs...",
      },
    },
    pl: {
      translation: {
        landingDescription: "Wybierz sposob wejscia do FocusOS: demo lokalne, portfel, Gmail lub GitHub.",
        localDemo: "Demo lokalne",
        connectMonad: "Polacz portfel Monad",
        liveLogPlaceholder: "Wpisz notatke lub zadanie podczas dzialania timera...",
      },
    },
    es: {
      translation: {
        landingDescription: "Elige como entrar a FocusOS: demo local, cartera, Gmail o GitHub.",
        localDemo: "Demostracion local",
        connectMonad: "Conectar cartera Monad",
        liveLogPlaceholder: "Escribe nota o tarea en vivo mientras corre el temporizador...",
      },
    },
  },
});

export default i18n;
