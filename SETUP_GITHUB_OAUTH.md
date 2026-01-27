# How to Configure GitHub Login for Xaytheon

The "Server Configuration Error" occurs because your backend does not have valid GitHub credentials. Follow these steps to fix it:

## 1. Create a GitHub OAuth App
1. Log in to your GitHub account.
2. Go to **Settings** (click your profile picture -> Settings).
3. Scroll down to **Developer settings** (bottom left sidebar).
4. Click **OAuth Apps** -> **New OAuth App**.

## 2. Fill in the Form
- **Application Name**: `Xaytheon (Local)`
- **Homepage URL**: `http://127.0.0.1:5500`
- **Authorization callback URL**: `http://127.0.0.1:5000/api/auth/github/callback`

## 3. Get Your Credentials
1. Click **Register application**.
2. You will see a **Client ID** (e.g., `Ov23...`). Copy this.
3. Click **Generate a new client secret**. Copy the **Client Secret** (e.g., `a1b2c3...`).

## 4. Update Your Code
1. Open the file `backend/.env` in your editor.
2. Paste your ID and Secret:
   ```env
   GITHUB_CLIENT_ID=paste_your_client_id_here
   GITHUB_CLIENT_SECRET=paste_your_client_secret_here
   ```
3. Save the file.

## 5. Restart the Server
The changes won't take effect until you restart the backend.
1. Stop the running server (Ctrl+C).
2. Run `npm start` again.
