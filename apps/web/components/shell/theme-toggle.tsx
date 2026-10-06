"use client";

import { Button } from "@yogan-hockey/ui/components/button";
import { useTheme } from "next-themes";

/**
 * Switches between light and dark. Until it is first pressed the site follows the operating
 * system; after that the visitor's choice is remembered.
 *
 * The label names the theme a press leads to. Both labels are rendered and CSS shows one, because
 * the theme is not known while the server renders.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="inline"
      className={className}
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <span className="dark:hidden">dark mode</span>
      <span className="hidden dark:inline">light mode</span>
    </Button>
  );
}
