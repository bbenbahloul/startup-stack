# Startup Stack 🚀

**Startup Stack** is a self-hosted, "Zero-Touch" infrastructure suite designed to spin up a fully integrated startup environment in minutes. It orchestrates Identity (SSO), Code Hosting, and Chat services using Docker, all managed by a custom **Manager Dashboard**.



## ✨ Key Features

* **One-Click Orchestration**: A custom Node.js **Manager** service automates the setup of complex Docker containers.
* **Zero-Touch SSO**: Keycloak is pre-configured as the central Identity Provider (IdP).
    * **Forgejo (Git)**: Accounts are automatically linked on first login (Hybrid Linking).
    * **Mattermost (Chat)**: Pre-configured to use Keycloak for authentication.
* **Centralized Dashboard**: A React-based UI to manage users, view system logs, and monitor service health.
* **Local & Production Ready**: Works out-of-the-box with `lvh.me` for local development or custom domains for production.

---

## 🏗️ Architecture

The stack runs on a single node using **Docker Compose**.

| Service | URL (Default) | Description |
| :--- | :--- | :--- |
| **Manager** | `http://dashboard.lvh.me` | The command center. Handles installation, user management, and logs. |
| **Keycloak** | `http://auth.lvh.me` | OIDC Identity Provider (Realm: `startup-stack`). |
| **Forgejo** | `http://git.lvh.me` | Git hosting (Gitea fork). Integrated via OIDC. |
| **Mattermost** | `http://chat.lvh.me` | Team collaboration and chat. |
| **Traefik** | `http://traefik.lvh.me` | Reverse proxy handling routing and SSL (optional). |

All services share a single **Postgres** database instance to conserve resources.

---

## 🚀 Quick Start

### Prerequisites
* Docker & Docker Compose installed.
* Node.js (optional, for local dev of the Manager).

### Installation

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/your-username/startup-stack.git](https://github.com/your-username/startup-stack.git)
    cd startup-stack
    ```

2.  **Start the Stack**
    Run the containers in detached mode. The default domain is `lvh.me` (which resolves to localhost).
    ```bash
    docker compose up -d
    ```

3.  **Initialize the System**
    * Open your browser to **[http://dashboard.lvh.me](http://dashboard.lvh.me)**.
    * You will see the **Setup Screen**.
    * Enter an **Admin Email** and **Password**.
    * Click **Install System**.

    *What happens next?*
    The Manager will:
    1.  Initialize the Database.
    2.  Wait for Keycloak to boot and configure the `startup-stack` realm.
    3.  Inject OIDC configurations into running Forgejo and Mattermost containers.
    4.  Log you in automatically.

---

## 🛠️ Usage

### Manager Dashboard
Once installed, the dashboard (`dashboard.lvh.me`) is your main hub.
* **Overview**: Check the status of all services (Online/Offline).
* **Users**: Create new users here. They are automatically created in Keycloak and linked to downstream services.
* **Logs**: View real-time logs from the installation process or specific containers.

### Accessing Services
* **Git**: Go to `git.lvh.me`. Click **Sign in with Keycloak**.
* **Chat**: Go to `chat.lvh.me`. Click **GitLab** (Note: Mattermost uses the GitLab plugin to talk to Keycloak).

---

## 📂 Project Structure

```text
.
├── docker-compose.yml       # Orchestration definition
├── init-postgres/           # DB Initialization scripts
├── manager/                 # The Orchestrator Application
│   ├── client/              # React Frontend (Vite)
│   │   ├── src/pages/       # Dashboard, Setup, Login pages
│   │   └── src/components/  # Sidebar, Layouts
│   ├── routes/              # Express API Routes (users, setup, logs)
│   ├── services/            # Business Logic
│   │   ├── installer.js     # Main installation sequence
│   │   ├── docker.js        # Docker socket interaction
│   │   ├── keycloak.js      # Keycloak Admin Client wrapper
│   │   ├── forgejo.js       # Git service configuration
│   │   └── mattermost.js    # Chat service configuration
│   └── server.js            # Entry point
└── setup-sso.sh             # Legacy/Helper setup script
