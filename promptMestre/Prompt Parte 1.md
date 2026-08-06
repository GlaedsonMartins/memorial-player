# MEMORIAL CLOUD

# PROMPT MESTRE — MEMORIAL PLAYER

## PARTE 1 — VISÃO GERAL, ARQUITETURA E FUNCIONAMENTO

# IDENTIDADE DO PROJETO

Você é o arquiteto de software responsável pelo desenvolvimento do **Memorial Player**, um sistema web que será executado permanentemente nos mini computadores conectados às televisões das salas velatórias.

O Memorial Player é independente do Memorial Admin.

Os dois projetos compartilham apenas o Firebase.

O Memorial Player nunca será utilizado por usuários finais.

Seu funcionamento deve ser totalmente automático.

O objetivo é transformar cada mini computador em um reprodutor digital dedicado.

---

# OBJETIVO

O Memorial Player será responsável exclusivamente pela reprodução das homenagens.

Ele nunca permitirá edição.

Ele nunca possuirá painel administrativo.

Ele nunca modificará dados.

Seu único objetivo é receber informações do Firebase e reproduzir a homenagem da sala correspondente.

---

# TECNOLOGIAS

Frontend

* React
* Next.js
* TypeScript

Interface

* Tailwind CSS

Banco

* Firebase Firestore

Arquivos

* Firebase Storage

Hospedagem

* Firebase Hosting

Tempo Real

* Firestore Snapshot Listeners

Offline

* Firestore Offline Persistence

PWA

Service Worker

Nunca utilizar outras tecnologias.

---

# FILOSOFIA

O Player deverá parecer um equipamento profissional.

O operador nunca deverá perceber que existe um navegador por trás.

Toda a interface deve ser limpa.

Sem menus.

Sem barras.

Sem botões.

Sem configurações.

---

# RESPONSABILIDADES

O Player deverá:

Conectar automaticamente ao Firebase.

Receber atualizações.

Baixar mídias.

Executar apresentações.

Executar playlists.

Executar vídeos.

Trabalhar offline.

Reconectar automaticamente.

Monitorar sua própria conexão.

Informar seu status ao sistema.

Nunca executar qualquer regra de negócio.

---

# O QUE O PLAYER NUNCA DEVE FAZER

Nunca editar homenagens.

Nunca criar homenagens.

Nunca excluir homenagens.

Nunca alterar playlists.

Nunca alterar dados do Firestore.

Nunca tomar decisões de negócio.

Toda lógica pertence ao Memorial Admin.

---

# FUNCIONAMENTO

Cada sala possuirá exatamente um Player.

Cada Player estará vinculado permanentemente à sua sala.

Cada Player abrirá uma URL fixa.

Exemplo:

/sala/1

/sala/2

...

/sala/6

Essa URL nunca muda.

---

# INICIALIZAÇÃO

Quando o mini computador for ligado:

Abrir automaticamente o navegador.

Abrir automaticamente a URL da sala.

Entrar em modo quiosque (Kiosk).

Conectar ao Firebase.

Verificar se existe uma homenagem ativa.

Caso exista:

Restaurar automaticamente a apresentação.

Caso não exista:

Exibir a identidade visual da funerária.

Todo esse processo deve ocorrer sem intervenção humana.

---

# ESTADO OCIOSO

Quando não existir homenagem ativa:

Exibir:

Logo da funerária.

Imagem institucional.

Tela limpa.

Sem animações desnecessárias.

Sem mensagens técnicas.

---

# COMUNICAÇÃO

Toda comunicação ocorrerá exclusivamente através do Firestore.

O Player deverá utilizar Snapshot Listeners para escutar alterações em tempo real.

Nunca utilizar polling.

Nunca exigir atualização manual da página.

---

# APRESENTAÇÃO

A apresentação será composta por:

Fotos.

Vídeos.

Playlist.

As mídias deverão ser exibidas exatamente na ordem em que foram cadastradas pelo administrador.

Não embaralhar.

Não reorganizar.

---

# FOTOS

Quantidade máxima:

20 fotos.

Formatos aceitos:

JPG.

PNG.

WEBP.

Tempo de exibição:

5 segundos.

8 segundos.

10 segundos.

O tempo será definido pelo Memorial Admin.

---

# VÍDEOS

Duração máxima:

1 minuto.

Durante a reprodução:

Utilizar o áudio do próprio vídeo.

Pausar a playlist.

Após o término:

Retomar a playlist exatamente do ponto onde parou.

---

# PLAYLIST

Cada homenagem utilizará apenas uma playlist.

Tipos:

Católica.

Evangélica.

A playlist deverá executar continuamente.

Quando chegar ao final:

Reiniciar automaticamente.

Nunca repetir apenas uma música.

Sempre percorrer todas as músicas antes de reiniciar.

---

# LOOP

A apresentação nunca termina sozinha.

Após a última mídia:

Reiniciar automaticamente.

Continuar até que o Memorial Admin encerre a homenagem.

---

# ENCERRAMENTO

Ao receber o comando de encerramento:

Interromper imediatamente a apresentação.

Cancelar qualquer reprodução de mídia.

Exibir novamente a identidade visual da funerária.

Nunca fechar a aplicação.

---

# CACHE

Todas as mídias deverão ser armazenadas em cache.

Caso a internet seja interrompida:

Continuar executando normalmente.

Nunca interromper uma homenagem ativa.

Utilizar os arquivos já armazenados localmente.

---

# RECONEXÃO

Quando a internet retornar:

Reconectar automaticamente.

Sincronizar alterações pendentes.

Atualizar mídias quando necessário.

Tudo deve acontecer sem intervenção do usuário.

---

# MONITORAMENTO

O Player deverá informar periodicamente ao Firebase:

Status Online.

Última sincronização.

Estado atual.

Versão da aplicação.

Essas informações serão utilizadas pelo Dashboard do Memorial Admin.

---

# OBJETIVO FINAL

O Memorial Player deve se comportar como um equipamento dedicado, estável e autônomo.

Após configurado, ele deve permanecer funcionando continuamente, exigindo intervenção apenas em casos excepcionais, enquanto recebe todas as instruções do Memorial Admin por meio do Firebase.
