import { LogoutButton } from '@/components/LogoutButton';
import { TopBand } from '@/components/TopBand';

export default function RefusedPage() {
  return (
    <div className="shell">
      <TopBand />
      <section className="gate pad">
        <div className="gate-card">
          <div className="eyebrow">Accès non accordé</div>
          <h1>Ta demande n&apos;a pas été validée</h1>
          <p>Si c&apos;est une erreur, écris directement à JDED sur @jdedcut.</p>
          <LogoutButton variant="button" />
        </div>
      </section>
    </div>
  );
}
