# MEMORIAL CLOUD

# PROMPT MESTRE — MEMORIAL PLAYER

## PARTE 3 — PADRÕES DE DESENVOLVIMENTO, REGRAS IMUTÁVEIS E DEFINIÇÃO DE CONCLUSÃO

# MISSÃO DO MEMORIAL PLAYER

O Memorial Player deverá funcionar como um equipamento digital dedicado.

Após instalado no mini computador da sala, ele deverá operar continuamente durante anos sem necessidade de configuração constante.

O usuário nunca deverá perceber que existe um navegador executando a aplicação.

Toda experiência deverá transmitir estabilidade, simplicidade e profissionalismo.

---

# PRINCÍPIOS DE DESENVOLVIMENTO

Durante todo o desenvolvimento seguir obrigatoriamente:

Código limpo.

Código modular.

Componentes reutilizáveis.

Separação clara entre interface, lógica e comunicação.

Baixo acoplamento.

Alta coesão.

Responsabilidade única para componentes, hooks e serviços.

Utilizar TypeScript com tipagem rigorosa.

Evitar qualquer duplicação de código.

---

# ORGANIZAÇÃO

Separar claramente:

Interface

Player

Cache

Firebase

Hooks

Services

Contexts

Utils

Types

Nunca misturar responsabilidades.

---

# FIREBASE

Toda comunicação ocorrerá exclusivamente através do Firebase.

Nunca utilizar polling.

Nunca utilizar WebSockets próprios.

Nunca criar APIs para sincronização.

Toda comunicação deverá utilizar Snapshot Listeners.

---

# STORAGE

Todos os arquivos deverão permanecer no Firebase Storage.

Nunca salvar mídias diretamente no Firestore.

Nunca converter arquivos para Base64.

---

# CACHE

O cache deverá ser tratado como parte fundamental do sistema.

Sempre utilizar arquivos locais quando disponíveis.

Nunca realizar downloads desnecessários.

Sempre validar alterações antes de substituir arquivos existentes.

---

# RESPONSIVIDADE

Embora o Player seja utilizado em televisões, a interface deverá adaptar-se corretamente a diferentes resoluções.

Suportar:

Full HD.

2K.

4K.

Ultrawide quando possível.

Nunca depender de tamanho fixo.

---

# EXIBIÇÃO

Fotos deverão ocupar a maior área possível da tela.

Preservar proporção.

Evitar distorções.

Vídeos deverão utilizar toda a área disponível.

Nunca exibir barras desnecessárias.

---

# TRANSIÇÕES

Utilizar transições suaves.

Evitar animações exageradas.

Priorizar elegância.

Nunca comprometer o desempenho.

---

# MEMÓRIA

Liberar recursos não utilizados.

Destruir objetos quando necessário.

Evitar vazamentos de memória.

Evitar crescimento contínuo do consumo de RAM.

---

# RECONEXÃO

Toda perda de conexão deverá ser tratada automaticamente.

Nunca solicitar ação do usuário.

Após reconectar:

Verificar atualizações.

Baixar novas mídias.

Atualizar estado.

Continuar reprodução normalmente.

---

# TRATAMENTO DE FALHAS

Caso algum arquivo não esteja disponível:

Continuar reproduzindo os demais.

Registrar o erro.

Nunca interromper toda a homenagem.

Caso uma mídia esteja corrompida:

Ignorá-la.

Continuar normalmente.

---

# OTIMIZAÇÃO

Pré-carregar a próxima mídia.

Evitar leituras repetidas.

Minimizar acesso ao Firestore.

Reduzir chamadas ao Storage.

Priorizar desempenho.

---

# SEGURANÇA

Bloquear menus do navegador.

Bloquear seleção de texto.

Ocultar cursor.

Operar em modo tela cheia.

Impedir que a interface administrativa seja acessível pelo Player.

---

# PADRÕES DE CÓDIGO

Criar componentes pequenos.

Criar hooks reutilizáveis.

Criar serviços especializados.

Utilizar nomes claros.

Utilizar tipagem consistente.

Evitar funções gigantes.

Evitar arquivos excessivamente grandes.

Sempre priorizar legibilidade.

---

# O QUE NUNCA FAZER

Nunca implementar lógica de negócio no Player.

Nunca alterar dados administrativos.

Nunca modificar homenagens.

Nunca modificar playlists.

Nunca excluir arquivos.

Nunca alterar informações do Firestore.

Nunca decidir qual homenagem será reproduzida.

Nunca substituir tecnologias definidas.

Nunca criar soluções fora da arquitetura estabelecida.

---

# COMPATIBILIDADE

O Player deverá funcionar corretamente em:

Google Chrome.

Microsoft Edge.

Mini computadores Windows.

Deverá ser preparado para futura compatibilidade com Smart TVs baseadas em navegador.

---

# FUTURAS EXPANSÕES

A arquitetura deverá permitir futuramente:

Suporte a múltiplas funerárias.

Novos tipos de playlists.

Novos tipos de mídia.

Exibição de mensagens enviadas pelo aplicativo da família.

Novos temas visuais.

Essas possibilidades devem ser previstas sem impactar a arquitetura atual.

---

# CRITÉRIOS DE CONCLUSÃO

O Memorial Player será considerado concluído quando atender aos seguintes requisitos:

* Inicializar automaticamente ao ligar o computador.
* Abrir automaticamente a URL fixa da sala.
* Operar em modo tela cheia (Kiosk).
* Reconectar automaticamente ao Firebase.
* Restaurar a última homenagem ativa.
* Exibir fotos conforme o tempo configurado.
* Reproduzir vídeos integralmente.
* Pausar a playlist durante vídeos e retomá-la após o término.
* Executar playlists em loop contínuo.
* Trabalhar normalmente mesmo sem internet utilizando cache.
* Sincronizar automaticamente quando a conexão retornar.
* Refletir alterações do Memorial Admin em tempo real.
* Informar seu status ao Dashboard.
* Exibir a identidade visual da funerária quando não houver homenagem ativa.
* Operar continuamente sem necessidade de intervenção do usuário.

---

# DOCUMENTO OFICIAL

Este documento define o comportamento oficial do Memorial Player.

Toda implementação deverá seguir rigorosamente estas diretrizes.

Caso exista dúvida durante o desenvolvimento, sempre priorizar a arquitetura, os princípios e as regras estabelecidas neste documento.

Nunca implementar soluções que contrariem estas definições.
