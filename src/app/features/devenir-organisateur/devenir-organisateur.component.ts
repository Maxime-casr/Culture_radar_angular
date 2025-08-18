import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-devenir-organisateur',
  imports: [CommonModule],
  template: `
  <section class="container">
    <header class="hero">
      <h1>Devenir organisateur</h1>
      <p class="lead">
        Vous organisez des concerts, expositions, ateliers ou festivals&nbsp;?
        Publiez vos événements sur CultureRadar et touchez le bon public.
      </p>
    </header>

    <article class="card">
      <h2>Comment ça marche&nbsp;?</h2>
      <ol class="steps">
        <li>Assurez-vous d’être connecté avec le compte qui servira d’espace organisateur.</li>
        <li>
          Envoyez-nous un e-mail à
          <a [href]="mailto" class="link" rel="noopener">
            maxime.casteras.edu&#64;groupe-gema.com
          </a>
          en précisant les informations ci-dessous.
        </li>
        <li>Nous vérifions rapidement votre demande et activons le rôle <b>organizer</b> sur votre compte.</li>
        <li>Une fois activé, un bouton <b>Organiser</b> apparaîtra dans la barre de navigation pour accéder à votre tableau de bord.</li>
      </ol>
    </article>

    <article class="card">
      <h2>Ce qu’il faut indiquer dans votre e-mail</h2>
      <ul class="check">
        <li><b>Nom & prénom</b> du référent</li>
        <li><b>Adresse e-mail du compte</b> CultureRadar à promouvoir</li>
        <li><b>Nom de l’organisme</b> (structure, collectif…)</li>
        <li><b>Site web / réseaux sociaux</b> (facultatif mais utile)</li>
        <li><b>Types d’événements</b> (concert, expo, théâtre, atelier…)</li>
        <li><b>Villes / zones géographiques</b> concernées</li>
        <li><b>Volume estimé</b> d’événements par mois</li>
      </ul>

      <div class="actions">
        <a class="btn primary" [href]="mailto">Écrire l’e-mail pré-rempli</a>
        <button class="btn ghost" type="button" (click)="copyEmail()">Copier l’adresse</button>
      </div>

      <details class="example">
        <summary>Voir un exemple de message</summary>
        <pre class="sample">
Objet : Demande de passage en “organisateur” – CultureRadar

Bonjour,

Je souhaite devenir organisateur sur CultureRadar.

• Compte (e-mail) : {{ email }}
• Organisme : …
• Site / RS : …
• Types d’événements : …
• Villes : …
• Volume estimé / mois : …

Merci beaucoup,
[Nom – Téléphone]
        </pre>
      </details>
    </article>

    <article class="card">
      <h2>Questions fréquentes</h2>
      <div class="faq">
        <p><b>Est-ce payant&nbsp;?</b><br>
          Non, la demande de passage en organisateur est gratuite.</p>

        <p><b>Puis-je revenir à un compte standard&nbsp;?</b><br>
          Oui, il suffit de nous recontacter pour repasser le rôle en “user”.</p>

        <p><b>Combien de temps pour l’activation&nbsp;?</b><br>
          Nous essayons de répondre rapidement après réception de votre e-mail.</p>
      </div>
    </article>

    <footer class="foot">
      Une question&nbsp;? Écrivez-nous à
      <a [href]="plainMailto" class="link" rel="noopener">maxime.casteras.edu&#64;groupe-gema.com</a>.
    </footer>
  </section>
  `,
  styles: [`
    .container { max-width: 860px; margin: 24px auto; padding: 0 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color:#0f172a; }
    .hero h1 { font-size: 32px; margin: 0 0 6px; }
    .lead { color:#475569; margin:0 0 16px; }
    .card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:16px; margin:14px 0; box-shadow: 0 1px 0 rgba(16,24,40,.04); }
    .card h2 { margin:0 0 12px; font-size:20px; }
    .steps { margin:0; padding-left: 20px; }
    .steps li { margin: 6px 0; }
    .check { list-style: none; padding-left: 0; margin: 0; }
    .check li { padding-left: 26px; position: relative; margin: 6px 0; }
    .check li::before { content: '✓'; position: absolute; left: 0; top: 0; color:#16a34a; font-weight: 700; }
    .actions { margin-top: 12px; display:flex; gap:10px; flex-wrap: wrap; }
    .btn { padding:10px 14px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; font-weight:600; }
    .btn.primary { background:#2152ff; color:#fff; border-color:#2152ff; }
    .btn.ghost { background:#f9fafb; }
    .link { color:#2152ff; text-decoration: underline; }
    .example { margin-top: 10px; }
    .example summary { cursor: pointer; color:#334155; }
    .sample { background:#0b1020; color:#e5e7eb; padding:12px; border-radius:10px; overflow:auto; white-space:pre-wrap; }
    .faq p { margin: 8px 0; }
    .foot { text-align:center; color:#475569; margin: 12px 0 6px; }
  `],
})
export class DevenirOrganisateurComponent {
  readonly email = 'maxime.casteras.edu@groupe-gema.com';

  // lien mailto simple (pour le footer)
  get plainMailto(): string {
    return `mailto:${this.email}`;
  }

  // lien mailto avec sujet + corps pré-remplis
  get mailto(): string {
    const subject = encodeURIComponent('Demande pour devenir organisateur – CultureRadar');
    const body = encodeURIComponent(
      `Bonjour,

Je souhaite devenir organisateur sur CultureRadar.

• Compte (e-mail) : ${this.email}
• Organisme :
• Site / RS :
• Types d’événements :
• Villes :
• Volume estimé / mois :

Merci beaucoup,
[Nom – Téléphone]`
    );
    return `mailto:${this.email}?subject=${subject}&body=${body}`;
  }

  async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.email);
      alert('Adresse copiée dans le presse-papiers.');
    } catch {
      alert('Impossible de copier. Sélectionnez et copiez l’adresse manuellement.');
    }
  }
}

