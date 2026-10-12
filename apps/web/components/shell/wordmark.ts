/**
 * The wordmark's type, for the masthead and for the global error page, which is drawn without the
 * layout. A plain string in a module with no "use client", so both can read it. The size, line
 * and tracking are `text-wordmark`'s (`packages/ui/src/theme.css`): one line at any width, since
 * 54px fills a 390px phone's column to within 2px and a narrower one shrinks it with the screen.
 */
export const wordmark =
  "whitespace-nowrap font-bold font-serif text-wordmark [font-variation-settings:'opsz'_72]";
