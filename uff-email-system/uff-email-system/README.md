# Sistema de E-mails UFF

Sistema web para cadastro de pessoas, verificação de e-mail, controle de
acesso (aprovado por um líder) e disparo de e-mails (template pronto ou
personalizado) para os cadastrados. Feito em **Node.js + Express**, padrão
**MVC**, banco de dados **Supabase** (PostgreSQL online).

> Este é o back-end funcional, ainda **sem identidade visual** (cores,
> logo, imagens). O CSS atual só garante que o layout funcione bem em
> celular e computador. A fase 2 é aplicar o visual da UFF.

## 1. Pré-requisitos
- Node.js 18+
- Uma conta no [Supabase](https://supabase.com) (grátis)
- Uma conta de e-mail para envio (Gmail com "senha de app", Outlook, ou
  um provedor tipo SendGrid/Mailgun via SMTP)

## 2. Criar o projeto no Supabase
1. Crie um novo projeto no [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** → cole todo o conteúdo do arquivo `sql/schema.sql`
   deste projeto → clique em **Run**. Isso cria as 5 tabelas do sistema.
3. Vá em **Project Settings → API** e copie:
   - `Project URL` → vai virar `SUPABASE_URL`
   - `service_role` key (não é a `anon`!) → vai virar
     `SUPABASE_SERVICE_ROLE_KEY`

   ⚠️ A `service_role` key tem poder total sobre o banco. Ela só é usada
   no back-end (nunca no navegador) e **não pode vazar** — por isso ela
   fica só no `.env`, que está no `.gitignore`.

## 3. Configurar o e-mail (SMTP)
Se for usar Gmail:
1. Ative a verificação em duas etapas na conta Google.
2. Crie uma "senha de app" em myaccount.google.com/apppasswords.
3. Use essa senha (não a senha normal da conta) no `SMTP_PASS`.

## 4. Instalar e configurar o projeto
```bash
npm install
cp .env.example .env
```
Abra o `.env` e preencha com os valores do Supabase e do SMTP.

## 5. Rodar
```bash
npm run dev    # com reinício automático (nodemon)
# ou
npm start
```
Acesse `http://localhost:3000`.

## 6. Criar o primeiro LÍDER
Como não existe líder no início, o primeiro precisa ser criado manualmente:

1. Cadastre a pessoa que será líder normalmente pelo site
   (`/pessoas/nova`) e confirme o e-mail dela (clique no link recebido).
2. No **SQL Editor** do Supabase, rode (trocando o e-mail):
   ```sql
   update users set role = 'leader', has_access = true,
     password_hash = null
   where person_id = (select id from people where email = 'lider@id.uff.br');
   ```
3. Para ela conseguir logar, gere um "esqueci minha senha" manual — a
   forma mais simples nesta primeira vez é rodar o pedido de acesso pelo
   próprio site (`/acesso/solicitar`) com o e-mail dela. Como o `role`
   já está `leader`, quando você (o próprio líder) "aprovar" o pedido
   dela pelo painel `/acesso/pendentes`, ela recebe o e-mail para criar
   a senha normalmente.

   *(Alternativa mais direta: você mesmo pode gerar o token via SQL e
   montar o link `/auth/definir-senha/SEU_TOKEN` manualmente, se preferir
   pular essa etapa.)*

## 7. Fluxo do sistema
1. **Cadastro** (`/pessoas/nova`) → qualquer um cadastra nome + e-mail.
2. **Verificação** → a pessoa recebe um e-mail e confirma clicando no link.
3. **Solicitar acesso** (`/acesso/solicitar`) → pessoa já verificada pede
   acesso ao painel usando o e-mail cadastrado.
4. **Líder aprova/nega** (`/acesso/pendentes`) → só o líder vê essa tela.
   - Se aprovar: a pessoa recebe e-mail para criar senha e vira usuária
     do sistema.
   - Se negar: a pessoa vê "acesso negado" ao consultar o status
     (`/acesso/status`), mas pode solicitar novamente quando quiser.
   - Uma vez aprovada, a pessoa não solicita mais acesso (login normal).
5. **Login** (`/auth/login`) → usuários autorizados entram com e-mail + senha.
6. **Enviar e-mail** (`/emails/selecionar`) → seleciona destinatários
   (um por um ou "selecionar todos") → escolhe entre **e-mail programado**
   (template já pronto) ou **personalizado** (escrito na hora) → envia.

## 8. Estrutura de pastas (MVC)
```
src/
  config/       -> variáveis de ambiente e cliente Supabase
  models/       -> acesso ao banco (people, users, access_requests, email)
  controllers/  -> regras de negócio
  routes/       -> rotas Express
  middlewares/  -> autenticação e checagem de líder
  services/     -> envio de e-mail e geração de tokens
  views/        -> páginas EJS
public/         -> CSS, JS e imagens (fase 2 entra aqui)
sql/schema.sql  -> script para criar as tabelas no Supabase
```

## Próximos passos (fase 2)
- Aplicar cores/identidade visual da UFF
- Adicionar logo e imagens
- Melhorar templates de e-mail (HTML mais rico)
- Opcional: agendamento real de envio (data/hora) com cron job
