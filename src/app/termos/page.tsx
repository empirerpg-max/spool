import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Termos de Uso · Lobby' };

export default function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" updated="16 de novembro de 2026">
      <section>
        <h2>1. O que é o Lobby</h2>
        <p>O Lobby é uma rede social para conversar sobre filmes, séries e livros. Você pode montar sua lista, dar notas, escrever resenhas, ver onde assistir ou comprar no Brasil e participar da comunidade de cada obra. O Lobby não exibe, não distribui e não vende filmes, séries ou livros.</p>
      </section>
      <section>
        <h2>2. Quem pode usar</h2>
        <ul>
          <li>Pessoas com <strong>16 anos ou mais</strong>.</li>
          <li>Neste momento, o cadastro é feito apenas com <strong>código de convite</strong>.</li>
          <li>Cada pessoa pode ter uma conta. Os dados informados no cadastro precisam ser verdadeiros.</li>
        </ul>
      </section>
      <section>
        <h2>3. Sua conta</h2>
        <ul>
          <li>Você é responsável por manter sua senha em segredo e por tudo que for feito com a sua conta.</li>
          <li>Seu nome de usuário (@) é público. Seu nome, sobrenome, data de nascimento e e-mail não aparecem para outras pessoas.</li>
          <li>Você pode pedir a exclusão da sua conta a qualquer momento pelo contato abaixo.</li>
        </ul>
      </section>
      <section>
        <h2>4. Regras da comunidade</h2>
        <ul>
          <li><strong>Respeito:</strong> nada de ofensas, assédio, discurso de ódio, ameaças ou exposição de dados de outras pessoas.</li>
          <li><strong>Spoiler:</strong> marque como spoiler tudo que revela partes importantes da história, e não coloque spoiler em títulos de tópicos.</li>
          <li><strong>Sem pirataria:</strong> é proibido divulgar links ou formas de acessar filmes, séries ou livros sem autorização de quem tem os direitos. Links para sites piratas conhecidos são bloqueados automaticamente.</li>
          <li><strong>Sem spam:</strong> nada de propaganda não solicitada, correntes ou mensagens repetidas.</li>
          <li>Não publique conteúdo ilegal, sexual explícito ou que viole direitos de terceiros.</li>
        </ul>
      </section>
      <section>
        <h2>5. Moderação</h2>
        <p>Qualquer pessoa pode denunciar um tópico ou resposta. A equipe do Lobby analisa as denúncias e pode remover conteúdos que quebrem estas regras e suspender ou banir contas, inclusive sem aviso prévio em casos graves. Se você acha que houve um engano, fale com a gente pelo contato abaixo.</p>
      </section>
      <section>
        <h2>6. O que você publica</h2>
        <p>Os textos que você escreve continuam sendo seus. Ao publicar no Lobby, você autoriza o Lobby a exibir esse conteúdo no site e no app, de forma gratuita e enquanto ele estiver publicado. Resenhas que você guarda só para você não são exibidas para ninguém.</p>
      </section>
      <section>
        <h2>7. Informações de terceiros</h2>
        <p>Dados das obras (sinopses, capas, elenco, datas) e de onde assistir vêm de serviços como TMDB, JustWatch, Open Library e Google Books. Eles podem conter erros ou mudar sem aviso. Os links para lojas e serviços de streaming levam a sites de outras empresas, com seus próprios termos.</p>
      </section>
      <section>
        <h2>8. Limites de responsabilidade</h2>
        <p>O Lobby é oferecido como está, e pode passar por mudanças, interrupções ou erros. Não nos responsabilizamos por opiniões publicadas por usuários nem por serviços de terceiros.</p>
      </section>
      <section>
        <h2>9. Mudanças nestes termos</h2>
        <p>Podemos atualizar estes termos. Quando a mudança for importante, avisaremos no site e poderemos pedir um novo aceite.</p>
      </section>
      <section>
        <h2>10. Privacidade e contato</h2>
        <p>Veja como tratamos seus dados na <Link href="/privacidade" className="underline">Política de Privacidade</Link>. Dúvidas, pedidos ou recursos: fale com a equipe do Lobby pelos canais informados no site.</p>
      </section>
    </LegalPage>
  );
}
