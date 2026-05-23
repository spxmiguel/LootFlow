# ⚡ LootFlow

<div align="center">

![Platform](https://img.shields.io/badge/platform-Web%20%7C%20PWA-brightgreen?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Firebase-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento%20%7C%20in%20development-orange?style=flat-square)
![Language](https://img.shields.io/badge/idioma-PT%20%7C%20EN-blueviolet?style=flat-square)
![AI](https://img.shields.io/badge/built%20with-Claude%20Sonnet-8B5CF6?style=flat-square&logo=anthropic)

**[🇧🇷 Português](#-português) · [🇺🇸🇬🇧 English](#-english)**

</div>

---

## 🇧🇷 Português

> **Dashboard para acompanhar, analisar e maximizar seus ganhos com drops semanais do CS2 Prime.**

### ⚠️ Em Desenvolvimento

> **Este projeto está em desenvolvimento ativo.** Podem existir bugs, instabilidades ou recursos incompletos. Sua ajuda é muito bem-vinda!
>
> Encontrou um problema? **[Reporte aqui →](../../issues/new)**
>
> Toda issue relatada ajuda a tornar o LootFlow melhor para todo mundo. Não tenha vergonha — bugs fazem parte do processo!

### ✨ Funcionalidades

| Feature | Descrição |
|---|---|
| 📊 **Dashboard** | Visão geral da semana: drops, cashout, progresso e contas pendentes |
| 🎮 **Contas CS2** | Múltiplas contas Prime · avatar via Steam URL · payback e ROI por conta |
| 💎 **Drops** | Registre até 2 drops/conta/semana · pesquisa bilíngue PT/EN no Steam Market · desgaste e float |
| 📈 **Analytics** | Gráficos semanais e acumulados · volume por conta · top 8 drops histórico |
| 🎯 **Metas** | Defina metas de cashout, receita ou drops com deadline e progresso visual |
| 📤 **Exportação** | CSV, XLSX (Drops + Contas separados) e backup/restore JSON completo |
| 🔔 **Bot WhatsApp** | Lembretes automáticos de drops pendentes · resumo semanal · comandos por chat |
| 🤬 **Modo Xingamentos** | Bot manda mensagem "motivacional" quando você esquece de farmar |
| ☁️ **Sync Firebase** | Login com Google + Firestore em tempo real · ou 100% offline via localStorage |
| 📱 **PWA** | Instala como app no celular · suporte a safe-area iOS |
| 🎨 **Tema** | Cor primária personalizável · glassmorphism · animações on/off |

### 🚀 Usar agora

Acesse direto no navegador — sem instalar nada:

**[▶ Abrir LootFlow → spxmiguel.github.io/LootFlow](https://spxmiguel.github.io/LootFlow)**

- Clique **"Entrar com Google"** para sync entre dispositivos
- Ou **"Continuar sem conta"** para uso 100% local (dados ficam só no seu navegador)

### 🤖 Bot WhatsApp

O LootFlow tem um bot de WhatsApp que roda em servidor próprio e avisa quando você está esquecendo de pegar os drops da semana.

**Comandos disponíveis:**

| Comando | O que faz |
|---|---|
| `STATUS` | Mostra drops registrados e pendentes da semana atual |
| `RESUMO` | Resumo completo da semana com cashout por conta |
| `AJUDA` | Lista todos os comandos disponíveis |
| `PARAR` | Desativa as notificações do bot |

**Modos de lembrete:**

| Modo | Comportamento |
|---|---|
| 🔔 Normal | Uma mensagem por dia no horário configurado |
| 😤 Enche o Saco | Manda a cada X minutos até você registrar os drops |
| 🤬 Xingamentos | Substitui os lembretes por mensagens "motivacionais" personalíveis |

Ative e configure em: **Configurações → Notificações WhatsApp**

### 🛠️ Desenvolvimento Local

**App:**
```bash
git clone https://github.com/spxmiguel/LootFlow.git
cd LootFlow
npm install
npm run dev
# Acesse http://localhost:5173
```

**Bot WhatsApp (repositório separado):**
```bash
git clone https://github.com/spxmiguel/lootflow-bot.git
cd lootflow-bot
npm install
cp .env.example .env   # preencha com credenciais Firebase Admin SDK
npm run dev
# Escaneie o QR code com o número dedicado do bot
```

**Build do app:**
```bash
npm run build          # gera dist/
npm run preview        # preview local do build
```

### 🔥 Firebase (opcional)

Sem Firebase o app funciona 100% offline. Para ativar login Google e sync entre dispositivos:

1. [console.firebase.google.com](https://console.firebase.google.com) → "Criar projeto"
2. Ative **Authentication → Google**
3. Crie **Firestore Database** em modo produção
4. Em **Authentication → Settings → Authorized domains** → adicione `seuusuario.github.io`

**Regras do Firestore:**
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{d=**} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

Configure dentro do próprio app em **Configurações → Firebase**, ou via variáveis de ambiente:

| Secret | Descrição |
|---|---|
| `VITE_FIREBASE_API_KEY` | API Key do projeto |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |

### 🚢 Deploy (GitHub Pages)

O repositório já tem CI/CD configurado. Para usar:

1. **GitHub Pages:** Settings → Pages → Source: **GitHub Actions**
2. Adicione os secrets acima em Settings → Secrets → Actions
3. Push na `main` → deploy automático em ~2 min

### 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Commit: `git commit -m "feat: descrição"`
4. Push e abra um Pull Request

---

## 🇺🇸🇬🇧 English

> **Dashboard to track, analyze and maximize your CS2 Prime weekly drop earnings.**

### ⚠️ In Development

> **This project is under active development.** Bugs, instabilities or incomplete features may exist. Your help is very welcome!
>
> Found an issue? **[Report it here →](../../issues/new)**
>
> Every bug report helps make LootFlow better for everyone. Don't be shy — bugs are part of the process!

### ✨ Features

| Feature | Description |
|---|---|
| 📊 **Dashboard** | Week overview: drops, cashout, progress and pending accounts |
| 🎮 **CS2 Accounts** | Multiple Prime accounts · Steam URL avatar · payback and ROI per account |
| 💎 **Drops** | Register up to 2 drops/account/week · bilingual PT/EN Steam Market search · wear and float |
| 📈 **Analytics** | Weekly and all-time charts · volume per account · top 8 drops history |
| 🎯 **Goals** | Set cashout, revenue or drop goals with deadlines and visual progress |
| 📤 **Export** | CSV, XLSX (separate Drops + Accounts sheets) and full JSON backup/restore |
| 🔔 **WhatsApp Bot** | Automatic pending drop reminders · weekly summary · chat commands |
| 🤬 **Rage Mode** | Bot sends "motivational" messages when you forget to farm |
| ☁️ **Firebase Sync** | Google login + real-time Firestore · or 100% offline via localStorage |
| 📱 **PWA** | Installable as a mobile app · iOS safe-area support |
| 🎨 **Theme** | Customizable primary color · glassmorphism · animations toggle |

### 🚀 Use it now

Access directly in your browser — no install needed:

**[▶ Open LootFlow → spxmiguel.github.io/LootFlow](https://spxmiguel.github.io/LootFlow)**

- Click **"Sign in with Google"** to sync across devices
- Or **"Continue without account"** for 100% local use (data stays in your browser only)

### 🤖 WhatsApp Bot

LootFlow has a WhatsApp bot that runs on a dedicated server and reminds you when you're forgetting to grab your weekly drops.

**Available commands:**

| Command | What it does |
|---|---|
| `STATUS` | Shows registered and pending drops for the current week |
| `RESUMO` | Full week summary with cashout per account |
| `AJUDA` | Lists all available commands |
| `PARAR` | Disables bot notifications |

**Reminder modes:**

| Mode | Behavior |
|---|---|
| 🔔 Normal | One message per day at the configured time |
| 😤 Annoying Mode | Sends every X minutes until you register your drops |
| 🤬 Rage Mode | Replaces reminders with customizable "motivational" messages |

Enable and configure at: **Settings → WhatsApp Notifications**

### 🛠️ Local Development

**App:**
```bash
git clone https://github.com/spxmiguel/LootFlow.git
cd LootFlow
npm install
npm run dev
# Open http://localhost:5173
```

**WhatsApp Bot (separate repo):**
```bash
git clone https://github.com/spxmiguel/lootflow-bot.git
cd lootflow-bot
npm install
cp .env.example .env   # fill in Firebase Admin SDK credentials
npm run dev
# Scan the QR code with the bot's dedicated number
```

**App build:**
```bash
npm run build          # outputs to dist/
npm run preview        # local preview of the build
```

### 🔥 Firebase (optional)

Without Firebase the app works 100% offline. To enable Google login and cross-device sync:

1. [console.firebase.google.com](https://console.firebase.google.com) → "Create project"
2. Enable **Authentication → Google**
3. Create **Firestore Database** in production mode
4. In **Authentication → Settings → Authorized domains** → add `yourusername.github.io`

**Firestore Rules:**
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{d=**} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

Configure inside the app at **Settings → Firebase**, or via environment variables:

| Secret | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Project API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |

### 🚢 Deploy (GitHub Pages)

The repository already has CI/CD configured. To use it:

1. **GitHub Pages:** Settings → Pages → Source: **GitHub Actions**
2. Add the secrets above in Settings → Secrets → Actions
3. Push to `main` → auto-deploy in ~2 min

### 🤝 Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m "feat: description"`
4. Push and open a Pull Request

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript + TailwindCSS + Framer Motion |
| State | Zustand |
| Charts | Recharts |
| Auth & DB | Firebase Authentication + Firestore |
| Steam | Steam Market API (price lookup) |
| Icons | Lucide React |
| Fonts | Geist + JetBrains Mono |
| Build | Vite + GitHub Actions |
| Bot | Node.js + whatsapp-web.js + node-cron + Firebase Admin SDK |
| Bot Deploy | PM2 + Oracle Cloud Free Tier |

---

## 🤖 Built with Claude

This project was developed in collaboration with [Claude](https://claude.ai) (Anthropic's AI). Claude helped design the architecture, write and review code, fix bugs, and iterate on the UI throughout development.

---

<div align="center">

MIT © 2025 — Feito com ☕ e raiva de perder drop.

**[🇧🇷 PT](#-português) · [🇺🇸🇬🇧 EN](#-english) · [Issues](../../issues) · [Abrir App](https://spxmiguel.github.io/LootFlow)**

</div>
