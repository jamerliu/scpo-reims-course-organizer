import { createContext, useContext, useState } from 'react';
import { STRINGS, translate } from './strings';

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: () => '' });

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en');
  const t = (key, vars) => translate(STRINGS, lang, key, vars);
  return (
    <LangContext.Provider value={{ lang, setLang, t, STRINGS }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
