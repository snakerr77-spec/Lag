# LAG Controller — projeto organizado

## Como abrir
Execute `INICIAR-SISTEMA.bat` ou abra `index.html` pelo Live Server. A primeira tela será o login.

## Estrutura
- `assets/images/`: logos e mascotes compartilhados.
- `shared/css/` e `shared/js/`: tema, permissões e configuração da sidebar.
- `home-page/`: Home principal.
- `controle/`: indicadores, exames e consultas.
- `almoxarifado/`: estoque, saídas, cadastros e solicitações.
- `perfil/`: perfil, temas, permissões e organização da sidebar.
- `topico/`: páginas criadas pelo administrador.
- `medicos-exames/`, `controladoria/`, `cadastro-medico/`, `contratacao-medicos/`: módulos administrativos.
- `prontuario-medico/` e `treinamentos/`: módulos preparados na identidade visual do sistema.

## Comportamento
- A sidebar inicia aberta em novas instalações e mantém o estado escolhido pelo usuário.
- Ao abrir a sidebar, a marca fica dentro do menu.
- Nome, cargo e unidade são carregados pelas configurações do perfil.
- As seções da sidebar permanecem: Principal, Gestão, Administração e Conta.
- Configurações são salvas no navegador; para vários computadores, use uma API e banco de dados.

## Atualização — Laudos Médicos e Controladoria

### Laudos médicos
- Novo módulo em `laudos-medicos/index.html`.
- Separação por Cardiologia e Neurologia.
- Pastas e PDFs organizados por Cerquilho, Tatuí, Embu das Artes e Itapeva.
- Pesquisa pelo nome do paciente, CPF, médico, exame ou arquivo.
- Administrador visualiza todas as cidades.
- Gestor cria/exclui pastas e administra laudos somente da cidade vinculada.
- Médico envia e consulta PDFs somente da cidade vinculada.
- PDFs ficam no IndexedDB do navegador nesta versão estática.

### Equipe e permissões
- A área `perfil/index.html` ganhou a aba **Equipe e cargos**.
- Cargos disponíveis: Administrador, Gestor, Médico, Financeiro, Laboratório e Colaborador.
- O administrador pode cadastrar usuários, definir cidade, cargo e permissões da sidebar.

### Controladoria
- Agora abre com a sidebar expandida.
- Mantém documentos organizados por pasta e cidade.
- Permite anexar PDF, Word, Excel ou imagem aos documentos.
- Usuários não administradores ficam limitados à cidade vinculada ao perfil.

> Importante: esta versão funciona somente no computador local. Execute `INICIAR-SISTEMA.bat`; os metadados e arquivos ficam salvos no navegador usado para abrir o sistema.

## Laudos médicos — categorias e cidades

- As categorias médicas são dinâmicas e podem ser criadas por Administrador ou Gestor.
- Cada categoria, pasta e laudo pertence a uma única cidade: Cerquilho, Tatuí, Embu das Artes ou Itapeva.
- Gestores e médicos permanecem vinculados à cidade cadastrada no usuário.
- Somente o Administrador pode alternar a cidade ativa e editar a cidade dos usuários no Perfil > Equipe e cargos.
- A versão local mantém os metadados no localStorage e os PDFs no IndexedDB. A pasta `laudos-medicos/database/schema.sql` contém a estrutura futura para D1 + R2.


## Atualização — Ultrassom incorporado aos Laudos Médicos

- O item separado **Ultrassom / Cliente** foi removido da sidebar e das permissões.
- A categoria e a pasta **Ultrassom** passam a existir dentro de `laudos-medicos/` para cada cidade.
- Exames de Ultrassom aceitam PDF e até 12 imagens JPG, PNG ou WEBP.
- O cadastro do exame exige CPF formatado e data de nascimento.
- Somente exames com status **Finalizado** e marcados como disponíveis aparecem no portal.
- Link do paciente: `laudos-medicos/portal-paciente/index.html`.
- No ambiente local, o portal é uma demonstração restrita ao mesmo navegador/origem.
- Para uso real, configure D1, R2 privado e Pages Functions conforme `SECURITY-CLOUDFLARE.md`.

## Atualização — Login, Central de Ajuda e Suporte

- `index.html` agora é a tela de login local do LAG Controller, com o lobo ao fundo.
- Acesso inicial: `gestor@lagcontroller.com` / `Lag2026`.
- Usuários criados em **Meu perfil > Equipe e cargos** podem receber uma senha provisória.
- Todas as páginas internas exigem sessão de login.
- O cartão inferior da sidebar foi substituído por **Suporte e atendimento**.
- O mini chat é aberto pelo cartão **Suporte e atendimento** no rodapé da sidebar.
- O atendimento pergunta módulo, erro, impacto e descrição antes de registrar o chamado.
- Chamados locais ficam em `localStorage` e são exibidos em **Meu perfil > Suporte** para administradores.
- Os chamados permanecem no painel **Meu perfil > Suporte** do administrador; não existe envio por WhatsApp nesta versão.
- A sidebar permanece aberta ao navegar entre módulos no desktop.
