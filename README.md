# LootFlow

> Dashboard moderno para acompanhar, analisar e calcular seus ganhos com drops do Prime CS2.

**[▶ Abrir agora → spxmiguel.github.io/LootFlow](https://spxmiguel.github.io/LootFlow)**

---

## O que é

LootFlow é um tracker de drops semanais do CS2. Registre os itens que você recebe nas suas contas Prime, acompanhe cashout, ROI e payback em tempo real — sem planilha, sem calculadora.

---

## Funcionalidades

| | |
|---|---|
| **Drops** | Registre até 2 drops por conta por semana · pesquisa bilíngue PT/EN · desgaste (FN/MW/FT/WW/BS) e float |
| **Contas** | Múltiplas contas Prime · avatar automático via Steam URL · payback e ROI por conta |
| **Analytics** | Gráficos semanais, acumulado, volume e distribuição por conta · Top 8 drops |
| **Metas** | Defina metas de cashout, receita ou drops com deadline |
| **Exportação** | CSV, XLSX (abas: Drops + Contas) e backup JSON |
| **Sync** | Login com Google + Firestore · ou 100% offline via localStorage |
| **PWA** | Instala como app no celular · suporte a safe-area iOS |
| **Perfil** | Nome personalizado, foto customizada, ocultar email (LGPD) |

---

## Stack

- **React 18** + TypeScript + Vite
- **TailwindCSS** + Framer Motion
- **Zustand** (estado global)
- **Firebase** Auth + Firestore (opcional)
- **Recharts** (gráficos)

---

## Usar online

Acesse direto — sem instalar nada:

```
https://spxmiguel.github.io/LootFlow
```

- Clique **"Entrar com Google"** para sync entre dispositivos
- Ou **"Continuar sem conta"** para uso 100% local

---

## Rodar localmente

```bash
git clone https://github.com/spxmiguel/LootFlow
cd LootFlow
npm install
npm run dev
```

Acesse `http://localhost:5173`.

---

## Firebase (opcional)

Sem Firebase o app funciona 100% offline. Para ativar login Google e sync entre dispositivos:

### 1. Criar projeto

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) → "Criar projeto"
2. Ative **Authentication → Google**
3. Crie **Firestore Database** em modo produção
4. Em Authentication → Settings → **Authorized domains** → adicione `seuusuario.github.io`

### 2. Regras do Firestore

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

### 3. Variáveis de ambiente

```bash
cp .env.example .env
# Preencha com as credenciais do seu projeto Firebase
```

Ou use a opção **"Usar Firebase próprio"** diretamente dentro do app (Configurações → Firebase).

---

## Deploy no GitHub Pages

### Automático (recomendado)

O repositório já tem workflow de CI/CD. Basta:

1. **GitHub Pages:** Settings → Pages → Source: **GitHub Actions**
2. **Secrets:** Settings → Secrets → Actions → adicione:

   | Secret | Valor |
   |--------|-------|
   | `VITE_FIREBASE_API_KEY` | API Key |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain |
   | `VITE_FIREBASE_PROJECT_ID` | Project ID |
   | `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
   | `VITE_FIREBASE_APP_ID` | App ID |

3. Faça um push na `main` — deploy automático em ~2 min.

### Manual

```bash
npm run build
# Suba a pasta dist/ para seu servidor
```

---

## Segurança

- Credenciais Firebase apenas em `VITE_*` env vars — nunca no código
- Firestore Rules com isolamento total por `uid`
- Dados locais ficam apenas no seu navegador
- Projeto open source — código auditável

---

## Desenvolvimento

Criado por um jogador de CS2 cansado de calcular drop na mão.  
Desenvolvido com auxílio de IA usando [Claude](https://claude.ai).
