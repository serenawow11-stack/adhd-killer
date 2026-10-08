import { createRoot } from 'react-dom/client';
import App from './App';
import { Provider } from './lib/store';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <Provider>
    <App />
  </Provider>,
);
// A new worker must not force-reload a running timer. It takes over after the old pages close.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(console.warn);
    });
  } else {
    void navigator.serviceWorker
      .getRegistrations()
      .then((rs) =>
        Promise.all(
          rs
            .filter((r) => r.scope === new URL(import.meta.env.BASE_URL, location.href).href)
            .map((r) => r.unregister()),
        ),
      );
  }
}
