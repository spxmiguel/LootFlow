# LootFlow
Dashboard moderno para acompanhar, analisar e calcular ganhos com drops semanais do Prime no CS2.

## ✨ Features

- 📦 Registro de drops semanais
- 💰 Cálculo automático de lucro e ROI
- 👥 Gerenciamento de múltiplas contas Prime
- 📊 Dashboard com analytics completos
- 🎯 Sistema de metas
- 🧾 Histórico de drops
- 🌙 Interface moderna e responsiva
- ⚡ Performance rápida e leve

## 🚀 Objetivo

O LootFlow foi criado pra facilitar a vida de quem farma drops no CS2 e quer visualizar tudo de forma organizada, sem precisar calcular lucro na mão ou usar planilhas confusas.

## 🛠️ Tecnologias

- React + TypeScript
- Vite
- TailwindCSS
- Firebase (Auth + Firestore)
- Framer Motion
- Recharts

---

## 📥 Formas de uso

### 🌐 Online via GitHub Pages

Acesse diretamente no navegador — sem instalar nada:  
**[https://spxmiguel.github.io/LootFlow](https://spxmiguel.github.io/LootFlow)**

Crie uma conta com Google para sincronizar entre dispositivos, ou entre como convidado para uso local.

### 💻 Instalação Local (offline)

```bash
git clone https://github.com/spxmiguel/LootFlow/
cd LootFlow
npm install
npm run dev
```

Acesse `http://localhost:5173` no navegador.

---

## 🔥 Configurar Firebase (opcional)

Sem Firebase, o app funciona 100% offline via localStorage.  
Para ativar **login Google** e **sync entre dispositivos**:

### 1. Criar projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um projeto novo
3. Ative **Authentication → Google**
4. Crie o **Firestore Database** em modo produção

### 2. Security Rules do Firestore

Em **Firestore → Rules**, use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Preencha com suas credenciais do Firebase
```

---

## 🚀 Deploy no GitHub Pages

### Automático (recomendado)

O repositório inclui um workflow que faz deploy automático a cada push na `main`.

**Passos:**

1. **Ative o GitHub Pages:**  
   Settings → Pages → Source: **GitHub Actions**

2. **Configure os secrets:**  
   Settings → Secrets → Actions → adicione cada `VITE_FIREBASE_*`:

   | Secret | Descrição |
   |--------|-----------|
   | `VITE_FIREBASE_API_KEY` | API Key do Firebase |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain |
   | `VITE_FIREBASE_PROJECT_ID` | Project ID |
   | `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
   | `VITE_FIREBASE_APP_ID` | App ID |
   | `VITE_FIREBASE_MEASUREMENT_ID` | Measurement ID |

3. **Adicione o domínio autorizado no Firebase:**  
   Authentication → Settings → Authorized domains → `seuusuario.github.io`

4. **Faça um push** — o deploy acontece automaticamente em ~2 minutos.

### Manual

```bash
npm run build
# Faça upload da pasta dist/ para seu servidor
```

---

## 🔒 Segurança

- Credenciais Firebase nunca expostas no código — usam `VITE_*` env vars
- Firestore Rules garantem isolamento total entre usuários
- Dados locais ficam apenas no seu navegador
- Modo offline 100% funcional sem conta ou servidor

---

## 🤖 Desenvolvimento

Feito a partir de ideias próprias e desenvolvido com auxílio de IA usando Claude.

---

Criado por um jogador de CS2 cansado de calcular drop na mão kkkkk
