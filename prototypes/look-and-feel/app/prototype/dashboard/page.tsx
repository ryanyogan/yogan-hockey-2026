// PROTOTYPE: three variants of the dashboard, switchable via ?variant=, on a throwaway route.
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import { VariantA } from "./variant-a";
import { VariantB } from "./variant-b";
import { VariantC } from "./variant-c";

export const dynamic = "force-dynamic";

const variants = [
  { key: "A", name: "Scoreboard wall" },
  { key: "B", name: "Family first" },
  { key: "C", name: "Tonight ledger" },
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
