# S.A.S. - Sistema de Gestão de Atendimentos

O **S.A.S.** (Secretaria de Assistência Social) é uma solução robusta para a gestão de fluxos de atendimento em órgãos públicos, focada em transparência, agilidade e inteligência de dados.

## 🚀 Visão Geral

Este projeto foi desenvolvido para resolver o problema de filas e falta de rastreabilidade em atendimentos sociais. Ele permite que a recepção crie fichas digitais que são encaminhadas em tempo real para setores específicos (Bolsa Família, Psicologia, etc.), onde técnicos podem registrar procedimentos e concluir atendimentos.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: JavaScript Vanilla (ES6+), HTML5, CSS3 (Modern UI).
- **Estilização**: Variáveis CSS, Bootstrap Icons, Fontes Premium (Outfit & Inter).
- **Banco de Dados**: Firebase Firestore (NoSQL).
- **Autenticação**: Firebase Auth.
- **Gráficos**: Chart.js v4.
- **Arquitetura**: SPA (Single Page Application) com roteamento dinâmico.

## ✨ Principais Funcionalidades

### 1. Dashboard Inteligente (Admin)
- Monitoramento em tempo real do volume de atendimentos por setor.
- Gráficos de fluxo horário para identificação de picos de demanda.
- Gestão completa de usuários e permissões.

### 2. Auditoria e Rastreabilidade (Oficial)
- **Histórico Unificado**: Cada alteração de ficha (mudança de assunto, status, etc.) e cada atendimento técnico são registrados com carimbo de tempo e autor.
- **Integridade**: Garantia de que o histórico de um cidadão atravessa todas as passagens dele pela secretaria.

### 3. Operação em Tempo Real
- **onSnapshot**: Atualização instantânea da lista de fichas sem necessidade de recarregar a página.
- **Alertas de Prioridade**: Sistema visual que destaca fichas com tempo de espera crítico (>1h ou >2h).

### 4. Usabilidade Moderna
- **Auto-save**: Persistência automática de campos de texto (Assunto/Solicitação).
- **Busca por CPF**: Localização instantânea de todo o histórico de um cidadão no sistema.

## 📈 Roadmap e Pensamento Estratégico

As atualizações do S.A.S. seguem o princípio da **Gestão Baseada em Dados**. O futuro do projeto contempla:

 **Módulo de Relatórios**: Exportação automatizada de dados mensais para tribunais de contas ou conselhos municipais.

---
**Desenvolvido com foco na eficiência pública e no respeito ao cidadão.**