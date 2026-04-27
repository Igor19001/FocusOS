import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "pl",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        // Landing/Onboarding
        landingDescription: "Choose a demo, Gmail, or wallet connection to enter FocusOS.",
        localDemo: "Local Demo",
        connectMonad: "Connect Wallet",
        connectGmail: "Connect Gmail",
        liveLogPlaceholder: "Type live note/task while timer runs...",

        // Onboarding Steps
        onboarding_welcome_title: "Hello! I'm Zeus.",
        onboarding_welcome_subtitle: "I'll help you focus on what matters.",
        onboarding_welcome_button: "Let's go →",

        onboarding_task_title: "Your first task",
        onboarding_task_subtitle: "Write one thing you want to do today",
        onboarding_task_placeholder: "e.g. Learn physics - chapter 3",
        onboarding_task_hint: "You don't need to plan the whole day. One task is enough.",
        onboarding_task_button: "Add task →",
        onboarding_task_skip: "Skip, I'll do it myself",

        onboarding_session_title: "Start your first session",
        onboarding_session_description: "A timer will count down 25 minutes. I'll keep you focused.",
        onboarding_session_button: "Start! ▶",

        // Zeus Messages
        zeus_tab_focus: "One task. One start. You got this.",
        zeus_tab_stats: "Checking your numbers. They look promising.",
        zeus_tab_report: "Your week in a nutshell. Let's see what you achieved.",
        zeus_tab_health: "Remember to drink water. Your brain works better hydrated.",
        zeus_tab_sleep: "Good sleep is half the battle tomorrow.",
        zeus_tab_settings: "Customize everything for yourself.",
        zeus_tab_about: "I'm Zeus. Your cybernetic focus coach.",
        zeus_tab_profile: "Your profile = your story.",

        zeus_session_start: "Focus enabled. Close everything else.",
        zeus_session_end: "Great work. I saved the result.",
        zeus_streak_7: "🔥 POWER! 7 days without stopping! 💪",
        zeus_streak_14: "🔥 UNSTOPPABLE! 14 days! You're a machine!",
        zeus_streak_30: "🔥 LEGEND! 30 days! This is legendary!",
        zeus_idle_quotes: [
          "Remember: focus is a superpower.",
          "Small steps lead to big results.",
          "You're closer than you think.",
          "Distractions are temporary. Your goal is forever.",
          "One more session. You can do it.",
          "The best time to focus was yesterday. The second best is now.",
          "Your future self will thank you.",
          "Nobody remembers the distractions. They remember the results.",
          "Discipline is choosing what you want more than what you want now.",
          "The only way out is through.",
        ],

        // Stats Empty State
        stats_empty_title: "Your first chart appears after you complete a session.",
        stats_progress: "sessions until stats unlock",
        stats_locked: "Unlocks after",

        // First Session Celebration
        celebration_first_session: "🎉 First session! Stats are starting to build.",

        // Health/Web3 Locked
        locked_feature: "Unlocks after",
        locked_features_hint: "Complete focus sessions to unlock advanced features.",
      },
    },
    pl: {
      translation: {
        // Landing/Onboarding
        landingDescription: "Wybierz demo, Gmail albo portfel, aby wejść do FocusOS.",
        localDemo: "Demo lokalne",
        connectMonad: "Połącz portfel",
        connectGmail: "Połącz Gmail",
        liveLogPlaceholder: "Wpisz notatkę lub zadanie podczas działania timera...",

        // Onboarding Steps
        onboarding_welcome_title: "Cześć! Jestem Zeus.",
        onboarding_welcome_subtitle: "Pomogę ci skupić się na tym co ważne.",
        onboarding_welcome_button: "Zaczynamy →",

        onboarding_task_title: "Twoje pierwsze zadanie",
        onboarding_task_subtitle: "Napisz jedno zadanie które chcesz dziś zrobić",
        onboarding_task_placeholder: "np. Nauka fizyki - rozdział 3",
        onboarding_task_hint: "Nie musisz planować całego dnia. Jedno zadanie wystarczy.",
        onboarding_task_button: "Dodaj zadanie →",
        onboarding_task_skip: "Pomiń, skoczę sam",

        onboarding_session_title: "Uruchom pierwszą sesję",
        onboarding_session_description: "Timer odliczy 25 minut. Zeus będzie cię pilnować.",
        onboarding_session_button: "Start! ▶",

        // Zeus Messages
        zeus_tab_focus: "Jedno zadanie. Jeden start. Dasz radę.",
        zeus_tab_stats: "Sprawdzam twoje liczby. Wyglądają obiecująco.",
        zeus_tab_report: "Twój tydzień w pigułce. Zobaczmy co wyszło.",
        zeus_tab_health: "Pamiętaj o wodzie. Twój mózg działa lepiej nawodniony.",
        zeus_tab_sleep: "Dobry sen to połowa sukcesu jutro.",
        zeus_tab_settings: "Dostosuj wszystko pod siebie.",
        zeus_tab_about: "Jestem Zeus. Twój cybernetyczny coach skupienia.",
        zeus_tab_profile: "Twój profil to twoja historia.",

        zeus_session_start: "Skupienie włączone. Zamknij wszystko inne.",
        zeus_session_end: "Dobra robota. Zapisałem wynik.",
        zeus_streak_7: "🔥 POTĘGA! 7 dni bez przerwania! 💪",
        zeus_streak_14: "🔥 NIEPOHAMOWANY! 14 dni! Jesteś maszyną!",
        zeus_streak_30: "🔥 LEGENDA! 30 dni! To jest legendarne!",
        zeus_idle_quotes: [
          "Pamiętaj: skupienie to supermoc.",
          "Małe kroki prowadzą do dużych rezultatów.",
          "Jesteś bliżej niż myślisz.",
          "Rozproszenia to chwila. Twój cel to zawsze.",
          "Jeszcze jedna sesja. Potrafisz.",
          "Najlepszy czas na skupienie był wczoraj. Drugi najlepszy to teraz.",
          "Twoje przyszłe ja będzie Ci za to wdzięczne.",
          "Nikt nie pamięta rozproszenia. Pamięta rezultaty.",
          "Dyscyplina to wybieranie tego co chcesz bardziej niż tego co chcesz teraz.",
          "Jedynym wyjściem jest droga do przodu.",
        ],

        // Stats Empty State
        stats_empty_title: "Twój pierwszy wykres pojawi się po ukończeniu sesji.",
        stats_progress: "sesji do odblokowania statystyk",
        stats_locked: "Odblokuje się za",

        // First Session Celebration
        celebration_first_session: "🎉 Pierwsza sesja! Statystyki zaczynają się budować.",

        // Health/Web3 Locked
        locked_feature: "Odblokuje się za",
        locked_features_hint: "Ukończ sesje skupienia aby odblokować zaawansowane funkcje.",
      },
    },
    es: {
      translation: {
        // Landing/Onboarding
        landingDescription: "Elige demo, Gmail o cartera para entrar en FocusOS.",
        localDemo: "Demo local",
        connectMonad: "Conectar cartera",
        connectGmail: "Conectar Gmail",
        liveLogPlaceholder: "Escribe nota o tarea en vivo mientras corre el temporizador...",

        // Onboarding Steps
        onboarding_welcome_title: "¡Hola! Soy Zeus.",
        onboarding_welcome_subtitle: "Te ayudaré a enfocarte en lo que importa.",
        onboarding_welcome_button: "Empecemos →",

        onboarding_task_title: "Tu primera tarea",
        onboarding_task_subtitle: "Escribe una cosa que quieres hacer hoy",
        onboarding_task_placeholder: "ej. Aprender física - capítulo 3",
        onboarding_task_hint: "No necesitas planificar todo el día. Una tarea es suficiente.",
        onboarding_task_button: "Añadir tarea →",
        onboarding_task_skip: "Saltar, lo haré yo mismo",

        onboarding_session_title: "Inicia tu primera sesión",
        onboarding_session_description: "Un temporizador contará 25 minutos. Yo te mantendré enfocado.",
        onboarding_session_button: "¡Empezar! ▶",

        // Zeus Messages
        zeus_tab_focus: "Una tarea. Un inicio. Puedes hacerlo.",
        zeus_tab_stats: "Revisando tus números. Se ven prometedores.",
        zeus_tab_report: "Tu semana en pocas palabras. Veamos qué lograste.",
        zeus_tab_health: "Recuerda beber agua. Tu cerebro funciona mejor hidratado.",
        zeus_tab_sleep: "Buen sueño es la mitad del éxito mañana.",
        zeus_tab_settings: "Personaliza todo para ti.",
        zeus_tab_about: "Soy Zeus. Tu entrenador cibernético de enfoque.",
        zeus_tab_profile: "Tu perfil es tu historia.",

        zeus_session_start: "Enfoque activado. Cierra todo lo demás.",
        zeus_session_end: "Excelente trabajo. Guardé el resultado.",
        zeus_streak_7: "🔥 ¡PODER! 7 días sin parar! 💪",
        zeus_streak_14: "🔥 ¡IMPARABLE! 14 días! ¡Eres una máquina!",
        zeus_streak_30: "🔥 ¡LEYENDA! 30 días! ¡Esto es legendario!",
        zeus_idle_quotes: [
          "Recuerda: el enfoque es un superpoder.",
          "Los pasos pequeños llevan a grandes resultados.",
          "Estás más cerca de lo que crees.",
          "Las distracciones son temporales. Tu objetivo es para siempre.",
          "Una sesión más. Puedes hacerlo.",
          "El mejor momento para enfocarse fue ayer. El segundo mejor es ahora.",
          "Tu yo futuro te lo agradecerá.",
          "Nadie recuerda las distracciones. Recuerdan los resultados.",
          "La disciplina es elegir lo que quieres más que lo que quieres ahora.",
          "La única forma de salir es avanzar.",
        ],

        // Stats Empty State
        stats_empty_title: "Tu primer gráfico aparecerá después de completar una sesión.",
        stats_progress: "sesiones para desbloquear estadísticas",
        stats_locked: "Se desbloquea después de",

        // First Session Celebration
        celebration_first_session: "🎉 ¡Primera sesión! Las estadísticas comienzan a construirse.",

        // Health/Web3 Locked
        locked_feature: "Se desbloquea después de",
        locked_features_hint: "Completa sesiones de enfoque para desbloquear funciones avanzadas.",
      },
    },
  },
});

export default i18n;
