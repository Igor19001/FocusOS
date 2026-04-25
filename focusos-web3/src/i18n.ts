import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        landingDescription: "Choose a demo, Gmail, or wallet connection to enter FocusOS.",
        localDemo: "Local Demo",
        connectMonad: "Connect Wallet",
        connectGmail: "Connect Gmail",
        liveLogPlaceholder: "Type live note/task while timer runs...",
      },
    },
    pl: {
      translation: {
        landingDescription: "Wybierz demo, Gmail albo portfel, aby wejsc do FocusOS.",
        localDemo: "Demo lokalne",
        connectMonad: "Polacz portfel",
        connectGmail: "Polacz Gmail",
        liveLogPlaceholder: "Wpisz notatke lub zadanie podczas dzialania timera...",
      },
    },
    es: {
      translation: {
        landingDescription: "Elige demo, Gmail o cartera para entrar en FocusOS.",
        localDemo: "Demo local",
        connectMonad: "Conectar cartera",
        connectGmail: "Conectar Gmail",
        liveLogPlaceholder: "Escribe nota o tarea en vivo mientras corre el temporizador...",
      },
    },
  },
});

export default i18n;
