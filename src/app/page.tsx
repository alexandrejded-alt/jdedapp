import { redirect } from 'next/navigation';

// Le middleware envoie déjà chacun au bon endroit. Ceci est le filet de sécurité.
export default function Home() {
  redirect('/cut');
}
