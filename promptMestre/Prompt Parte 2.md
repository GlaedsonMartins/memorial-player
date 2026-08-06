# MEMORIAL CLOUD

# PROMPT MESTRE — MEMORIAL PLAYER

## PARTE 2 — ESTADOS, SINCRONIZAÇÃO, REPRODUÇÃO E COMPORTAMENTO

# FILOSOFIA DO PLAYER

O Memorial Player deve ser tratado como um equipamento dedicado.

Após instalado, ele deverá permanecer funcionando continuamente.

Nunca depender da interação do usuário.

Todo comportamento deverá ser automático.

---

# MÁQUINA DE ESTADOS

O Player poderá assumir apenas os seguintes estados:

Inicializando

Conectando

Sincronizando

Pronto

Executando Homenagem

Sem Homenagem

Offline

Reconectando

Erro

Nunca criar estados diferentes sem necessidade.

---

# FLUXO DE INICIALIZAÇÃO

Ao iniciar:

1. Carregar a aplicação.
2. Restaurar o cache local.
3. Conectar ao Firebase.
4. Identificar a sala configurada.
5. Buscar a homenagem ativa.
6. Baixar mídias ausentes.
7. Atualizar o status no Firestore.
8. Iniciar a reprodução ou exibir a tela institucional.

Todo esse processo deve ser automático.

---

# SINCRONIZAÇÃO

O Player deve escutar apenas os dados da sua própria sala.

Nunca processar dados de outras salas.

Toda atualização deve ser refletida sem recarregar a página.

---

# DOWNLOAD DAS MÍDIAS

Ao receber uma nova homenagem:

Verificar quais arquivos já estão em cache.

Baixar apenas os arquivos ausentes.

Nunca baixar novamente arquivos já armazenados.

---

# REPRODUÇÃO DAS MÍDIAS

As mídias serão reproduzidas na ordem definida pelo Memorial Admin.

Fotos:

Exibir durante o tempo configurado.

Vídeos:

Reproduzir integralmente.

Nunca interromper um vídeo antes do término, exceto se a homenagem for encerrada.

---

# COMPORTAMENTO DAS PLAYLISTS

Ao iniciar a homenagem:

Iniciar automaticamente a playlist selecionada.

Quando um vídeo começar:

Pausar a música.

Quando o vídeo terminar:

Retomar a playlist do ponto em que foi interrompida.

Ao final da playlist:

Reiniciar automaticamente.

---

# ALTERAÇÕES DURANTE A APRESENTAÇÃO

Se novas fotos forem adicionadas:

Adicionar ao final da sequência.

Continuar a apresentação normalmente.

Se uma foto ainda não exibida for removida:

Remover imediatamente da fila.

Se a foto estiver sendo exibida:

Finalizar o tempo configurado e removê-la em seguida.

O mesmo comportamento deverá ser aplicado aos vídeos.

---

# CACHE E MODO OFFLINE

Todo conteúdo necessário para a homenagem ativa deve permanecer disponível localmente.

Caso a conexão com a internet seja perdida:

Continuar a apresentação utilizando o cache.

Não interromper músicas, fotos ou vídeos.

Ao restabelecer a conexão:

Verificar alterações e sincronizar automaticamente.

---

# MONITORAMENTO

O Player deverá atualizar periodicamente seu estado no Firestore.

Informações mínimas:

* Online ou Offline.
* Última sincronização.
* Estado atual.
* Versão da aplicação.
* Último heartbeat.

Esses dados serão exibidos no Dashboard do Memorial Admin.

---

# TRATAMENTO DE FALHAS

Toda operação deve possuir tratamento de erro.

Caso o download de uma mídia falhe:

Tentar novamente automaticamente.

Caso continue falhando:

Registrar o erro.

Continuar a apresentação com as mídias disponíveis.

Nunca travar a aplicação.

---

# RECUPERAÇÃO APÓS REINICIALIZAÇÃO

Após reiniciar o computador ou o navegador:

Restaurar automaticamente a última homenagem ativa.

Utilizar o cache para iniciar rapidamente.

Sincronizar com o Firebase para verificar atualizações.

---

# ESTRUTURA DO PROJETO

Organizar por responsabilidade.

Exemplo:

* app
* components
* hooks
* services
* firebase
* player
* cache
* contexts
* types
* utils

Separar claramente interface, lógica e comunicação com o Firebase.

---

# COMPONENTES

Criar componentes reutilizáveis para:

* Exibição de imagem.
* Reprodução de vídeo.
* Controle de playlist.
* Tela institucional.
* Indicador de carregamento.
* Estados de erro.

Cada componente deve possuir apenas uma responsabilidade.

---

# PERFORMANCE

Pré-carregar a próxima mídia antes da troca.

Evitar carregamentos perceptíveis durante a apresentação.

Liberar recursos não utilizados.

Manter baixo consumo de memória.

---

# SEGURANÇA

O Player não deve permitir navegação para outras páginas.

Bloquear menus de contexto.

Bloquear seleção de texto.

Ocultar o cursor após alguns segundos sem movimento.

Operar preferencialmente em modo quiosque (Kiosk).

---

# EXPERIÊNCIA DO USUÁRIO

O operador não deve precisar interagir com o Player.

Após configurado, todo o funcionamento deve ser automático.

O sistema deve transmitir a sensação de um equipamento profissional dedicado à reprodução das homenagens.
