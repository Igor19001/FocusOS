import { useState, useEffect } from 'react';

/**
 * Hook do zarządzania wiadomościami Zeusa
 * - Generuje wiadomości na podstawie aktualnej karty i stanu aplikacji
 * - Kolejkuje wiadomości
 * - Zarządza timingiem pojawiania się/znikania
 */
export const useZeusMessages = (currentTab, sessionActive, streakDays = 0, lastSessionDuration = 0) => {
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [messageQueue, setMessageQueue] = useState([]);
  const [reaction, setReaction] = useState(null); // 'bounce', 'shake', 'glow', itp.

  // Baza wiadomości dla każdej karty
  const messagesByTab = {
    Skupienie: [
      '💪 Nic cię nie rozprasza. Jesteś niezniszczalny!',
      '⚡ Każda minuta liczy się. Skoncentruj się!',
      '🎯 Twój umysł jest jak ostrze. Cięcie!',
      '🔥 Sesja już trwa. Utrzymaj ten rhythm!',
      '✨ Głębokie skupienie zmienia świat.',
    ],
    Statystyki: [
      '📊 Nieźle się robimy! Ciągnij dalej!',
      '🏆 Te liczby nie kłamią - jesteś potęgą!',
      '📈 Wiesz co? To jest progres wart robienia zdjęcia.',
      '💯 Twoje metryki są piękne. Nawet mi się łzawią.',
      '🚀 Te statystyki to nie przypadek. To konsekwencja.',
    ],
    Raport: [
      '📋 Raport gotów. Czas celebrować! 🎉',
      '✅ Podsumowanie tygodnia? Solidnie!',
      '📝 Te dane mówią o tobie wszystko. Bravo!',
      '🎊 Raport weekly to proof of work!',
      '💡 Patrz na to - to jest twoja geniusz.',
    ],
    Zdrowie: [
      '💧 Hydratacja to zdrada serca. Pij wodę!',
      '🏃 Przytrzymaj się. Ruch = energia!',
      '🧘 Twoje ciało to dom. Zadbaj o niego.',
      '❤️ Zdrowie to fundament. Nie lekceważ!',
      '⚡ Energia pozytywna bije z ciebie! Trzymaj!',
    ],
    Sen: [
      '😴 Spałeś dobrze? To się widać w fokusie!',
      '🌙 Sen to superpower. Nie ignoruj go!',
      '😴 Twój umysł wytwórczy śpi pół snu?',
      '✨ Odpocznij. Nawet bohaterowie potrzebują snu.',
      '🛌 Jakość snu = jakość życia. Pamiętaj!',
    ],
    Ustawienia: [
      '⚙️ Dobre ustawienia = lepszy fokus!',
      '🎨 Personalizacja to sztuka. Fajnie!',
      '🔧 Każde urządzenie pracy ma swoje ustawy.',
      '✨ Wiesz, co robisz. Konfiguracja jak sensei!',
      '⚡ Ustawienia optymalne = wydajność!',
    ],
    'O aplikacji': [
      '🤖 Jestem Zeus. Twój cybernetyczny coach!',
      '💫 FocusOS to aplikacja przyszłości.',
      '🚀 Kod, algorytm, magia. Wszystko tu!',
      '✨ Za każdym pikselem stoi pasja.',
      '🌟 Ludzie budują aplikacje. Passion to paliwo!',
    ],
    Profil: [
      '👤 Twój profil = twoja historia!',
      '🎯 Tożsamość. Dane. Marzenia. Wszystko tutaj!',
      '⭐ Profilowe dane to rzeczywistość twoich celów.',
      '🏅 Historia = dowód pracy. Baw się tym!',
      '💎 Ten profil jest unikatowy. Ty jesteś unikatowy!',
    ],
  };

  const idleMessages = [
    '🎯 Pamiętaj: skupienie to supermoc.',
    '⚡ Każda sesja zmienia trajektorię.',
    '🌟 Chcesz osiągnąć wielkie? Zacznij mały krok.',
    '💪 Tylko ty możesz zatrzymać siebie.',
    '🚀 Przyszłość budują ludzie teraz skupieni.',
    '✨ Dyscyplina to nastoletnia reguła sukcesu.',
    '🎊 Małe wygrane = duże zwycięstwa później.',
  ];

  // Wiadomości na specjalne zdarzenia
  const eventMessages = {
    sessionStart: '🚀 Rozpoczynamy! Zrobisz to!',
    sessionEnd: (duration) => `🎉 Świetna sesja! +${Math.ceil(duration / 25)} FCS zarobione!`,
    streakMilestone: (days) => `🔥 POTĘGA! ${days} dni bez przerwania! 💪`,
    inactivity: '💭 Cichutko tu siedzisz. Wracaj do gry!',
    tabSwitch: (tab) => `👋 ${tab}? Zmiana tematu, nowy focus!`,
  };

  // Generuj losową wiadomość dla aktualnej karty
  const generateTabMessage = (tab) => {
    const messages = messagesByTab[tab] || idleMessages;
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Pokaż wiadomość z animacją
  const showMessage = (text, animationType = 'fade', duration = 5000) => {
    setMessage(text);
    setIsVisible(true);
    setReaction(animationType);

    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setMessage('');
        setReaction(null);
      }, 300); // Czekaj na fade out
    }, duration);
  };

  // Dodaj wiadomość do kolejki
  const queueMessage = (text, animationType = 'fade', duration = 5000) => {
    setMessageQueue((prev) => [...prev, { text, animationType, duration }]);
  };

  // Przetwarzaj kolejkę wiadomości
  useEffect(() => {
    if (messageQueue.length > 0 && !isVisible) {
      const nextMessage = messageQueue[0];
      setMessageQueue((prev) => prev.slice(1));
      showMessage(nextMessage.text, nextMessage.animationType, nextMessage.duration);
    }
  }, [messageQueue, isVisible]);

  // Reaguj na zmianę karty
  useEffect(() => {
    if (currentTab) {
      const msg = generateTabMessage(currentTab);
      queueMessage(msg, 'fade', 4000);
    }
  }, [currentTab]);

  // Reaguj na start sesji
  useEffect(() => {
    if (sessionActive) {
      queueMessage(eventMessages.sessionStart, 'bounce', 3500);
    }
  }, [sessionActive]);

  // Reaguj na osiągnięcie streak milestone'a
  useEffect(() => {
    if (streakDays > 0 && streakDays % 7 === 0) {
      queueMessage(eventMessages.streakMilestone(streakDays), 'glow', 5000);
    }
  }, [streakDays]);

  // Co 60 sekund pokaż random wisdom (jeśli sesja nie aktywna)
  useEffect(() => {
    if (!sessionActive) {
      const interval = setInterval(() => {
        const randomMsg = idleMessages[Math.floor(Math.random() * idleMessages.length)];
        queueMessage(randomMsg, 'fade', 4000);
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [sessionActive]);

  return {
    message,
    isVisible,
    reaction,
    showMessage,
    queueMessage,
  };
};
