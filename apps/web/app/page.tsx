import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";

/** A placeholder inside the shell until the dashboard ledger (#49) replaces it. */
export default function HomePage() {
  return (
    <Section>
      <SectionHeader title="Tonight" count="no games loaded yet" />
      <p className="border-foreground/20 border-t px-2 py-1.5 text-foreground/70">
        The dashboard is being built. Scores, standings and the family's seasons will appear here.
      </p>
    </Section>
  );
}
