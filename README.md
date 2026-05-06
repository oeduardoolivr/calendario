# Projeto Calendário de Inventário - Azul Atacarejo

Este projeto é um calendário web interativo para gerenciar a programação de inventários.

## Estrutura do Projeto
- `public/`: Contém os arquivos do frontend (HTML, CSS, JS).
- `functions/`: Contém a lógica do backend (Cloudflare Functions).
- `wrangler.toml`: Configuração para o Cloudflare.

## Como Testar Localmente
1. Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.
2. Abra o terminal na pasta do projeto.
3. Instale as dependências (Wrangler):
   ```bash
   npm install
   ```
4. Execute o ambiente de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:8888` no seu navegador.
   - Use a senha padrão `admin123` para testar o acesso administrativo.

## Como Fazer o Deploy no Cloudflare
1. Faça login no Cloudflare via terminal:
   ```bash
   npx wrangler login
   ```
2. Crie um Namespace KV para os dados:
   ```bash
   npx wrangler kv:namespace create CALENDAR_DATA
   ```
3. Copie o `id` que aparecer no terminal e cole no arquivo `wrangler.toml` no lugar de `YOUR_KV_NAMESPACE_ID`.
4. Faça o deploy do projeto:
   ```bash
   npm run deploy
   ```
5. No painel do Cloudflare (Pages > Seu Projeto > Settings > Environment Variables), adicione a variável `ADMIN_PASSWORD` com a senha de sua preferência para proteger as edições.

## Funcionalidades Implementadas
- Visualização em grade (estilo calendário mensal).
- Navegação entre meses.
- Botão de acesso administrativo com senha.
- Edição de setores ao clicar no dia (apenas para admins).
- Persistência em tempo real usando Cloudflare KV.
- Design responsivo (funciona bem no celular).
