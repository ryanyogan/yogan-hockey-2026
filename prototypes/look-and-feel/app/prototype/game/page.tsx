// PROTOTYPE: three variants of the live game page, switchable via ?variant=, on a throwaway route.
// A fake Game Stream reveals one play every few seconds so each layout can be judged in motion.
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import { VariantA } from "./variant-a";
import { VariantB } from "./variant-b";
import { VariantC } from "./variant-c";

export const dynamic = "force-dynamic";

const variants = [
  { key: "A", name: "Broadcast split" },
  { key: "B", name: "Feed first" },
  { key: "C", name: "Rink as the page" },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  const variant = (await searchParams).variant ?? "A";
  return (
    <>
      {variant === "A" && <VariantA />}
      {variant === "B" && <VariantB />}
      {variant === "C" && <VariantC />}
      <PrototypeSwitcher variants={variants} current={variant} />
    </>
  );
}
