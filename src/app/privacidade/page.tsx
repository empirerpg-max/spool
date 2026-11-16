import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';
import { ContactLine } from '@/components/legal/ContactLine';

export const metadata: Metadata = { title: 'Política de Privacidade · Lobby' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updated="16 de novembro de 2026">
      <section>
        <h2>1. Resumo</h2>
        <p>Coletamos só o necessário para sua conta funcionar e para a comunidade ser segura. Não vendemos seus dados. Esta política segue a Lei Geral de Proteção de Dados (LGPD).</p>
      </section>
      <section>
        <h2>2. Que dados coletamos</h2>
        <ul>
          <li><strong>No cadastro:</strong> nome, sobrenome, data de nascimento, e-mail, senha (guardada de forma protegida, nem a equipe consegue ver) e o aceite destes documentos.</li>
          <li><strong>No uso:</strong> seu nome de usuário, sua lista, notas, resenhas, tópicos, respostas e denúncias que você fizer.</li>
          <li><strong>Técnicos:</strong> informações necessárias para manter você conectado (cookies de sessão) e registros de acesso para segurança.</li>
        </ul>
      </section>
      <section>
        <h2>3. Para que usamos</h2>
        <ul>
          <li>Criar e manter sua conta e permitir que você entre.</li>
          <li>Confirmar que você tem pelo menos 16 anos.</li>
          <li>Mostrar sua lista e suas resenhas para você, e o que você publicar para a comunidade.</li>
          <li>Moderar a comunidade e proteger o Lobby contra abusos.</li>
          <li>Quando esse recurso estiver disponível, enviar os avisos que você ativar, como estreias e novas temporadas.</li>
        </ul>
      </section>
      <section>
        <h2>4. O que é público e o que é privado</h2>
        <ul>
          <li><strong>Público:</strong> seu nome de usuário (@) e o que você publica na comunidade (tópicos, respostas e resenhas que você escolheu publicar).</li>
          <li><strong>Privado:</strong> nome, sobrenome, data de nascimento, e-mail, sua lista, suas notas e as resenhas guardadas só para você.</li>
        </ul>
      </section>
      <section>
        <h2>5. Com quem compartilhamos</h2>
        <p>Usamos serviços que guardam e processam dados para nós: Supabase (banco de dados e login) e Vercel (hospedagem do site). Eles só usam os dados para prestar esse serviço. Não compartilhamos seus dados pessoais com anunciantes.</p>
      </section>
      <section>
        <h2>6. Por quanto tempo guardamos</h2>
        <p>Enquanto sua conta existir. Se você pedir a exclusão, apagamos seus dados pessoais, exceto o que a lei exigir que seja mantido por mais tempo.</p>
      </section>
      <section>
        <h2>7. Seus direitos</h2>
        <p>Você pode pedir para ver, corrigir, levar para outro serviço ou apagar seus dados, e retirar seu consentimento. Faça o pedido <ContactLine />.</p>
      </section>
      <section>
        <h2>8. Menores de idade</h2>
        <p>O Lobby é para pessoas com 16 anos ou mais. Se descobrirmos uma conta de alguém mais novo, ela será removida.</p>
      </section>
      <section>
        <h2>9. Mudanças</h2>
        <p>Se esta política mudar de forma importante, avisaremos no site. Veja também os <Link href="/termos" className="underline">Termos de Uso</Link>.</p>
      </section>
    </LegalPage>
  );
}
