import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend'; // To load translations from /public/locales

i18n
    // load translation using http -> see /public/locales
    // learn more: https://github.com/i18next/i18next-http-backend
    .use(HttpApi)
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languageDetector
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init({
        lng: 'fi', // Default language
        supportedLngs: ['fi', 'en'],
        fallbackLng: 'fi',
        debug: process.env.NODE_ENV === 'development', // Enable debug output in development
        detection: {
            order: ['localStorage', 'cookie', 'navigator', 'htmlTag'], // Order of detection
            caches: ['localStorage', 'cookie'], // Where to cache the detected language
        },
        backend: {
            loadPath: `${process.env.PUBLIC_URL}/locales/{{lng}}/translation.json`, // Path to your translation files in the public folder
        },
        react: {
            useSuspense: false, // Make sure this is false if not using Suspense for translations
        },
    });

export default i18n;