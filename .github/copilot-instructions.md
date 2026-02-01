# CONTEXT.md: Startup Stack Infrastructure, SSO Logic & Roadmap

## 1. System Overview


* **Orchestration**: Docker Compose (Single-node).
* **Reverse Proxy**: Traefik handles SSL termination and routing via subdomains (e.g., `auth.`, `chat.`, `git.`, `dashboard.`) on the primary domain `${DOMAIN}`.
* **Identity Provider (IdP)**: Keycloak manages OIDC authentication in a dedicated realm named `startup-stack`.
* **Integrated Services**:
    * **Mattermost**: Team chat integrated via OIDC.
    * **Forgejo**: Git service (v9.0+) integrated via OIDC.
    * **Manager Dashboard**: Node.js application that automates installation, orchestrates OIDC client creation, and acts as a central portal.

## 2. Authentication Strategy: Zero-Touch SSO
The core requirement is to bypass all "Link Account," "Register New Account," or manual registration screens during the first-time user login.

### Keycloak Configuration
* **Identity Mapping**: The Keycloak User UUID is mapped to the `preferred_username` claim. This ensures Forgejo receives a valid, unique alphanumeric string that satisfies its strict username validation rules.
* **Redirect Trust**: The Forgejo OIDC client in Keycloak is configured to trust multiple redirect URIs, including the internal dashboard (`localhost:3000`) and the public dashboard subdomain (`dashboard.${DOMAIN}`), to allow for seamless programmatic token exchange.

### Forgejo Hybrid Linking Logic
Because native CLI flags for account linking can be version-dependent, the system utilizes a **Hybrid Method** to force account synchronization:
1.  **Creation**: The OIDC auth source and a local admin user (`gitadmin`) are created via the Forgejo CLI.
2.  **ID Extraction**: The script captures the container's standard output to retrieve the internal `Auth Source ID` and the Forgejo `User ID` via regex.
3.  **Database Injection**: A SQL `INSERT` is executed directly into the Forgejo Postgres database table `external_login_user`. This pre-validates the link between the Keycloak UUID and the local Forgejo account, ensuring the user is logged in instantly upon clicking the SSO button.

## 3. Manager Backend Capabilities
* **Programmatic Login**: Exposes an endpoint to perform a direct password grant login to Keycloak, returning an access token to the frontend immediately after installation.
* **Code Exchange**: Implements an OAuth2 `authorization_code` exchange flow to convert Keycloak redirect codes into session tokens for the dashboard.
* **Idempotency**: Installation scripts are designed to be re-run safely, updating OIDC clients (such as adding new redirect URIs) without breaking existing configurations.

## 4. Roadmap & Future Features
The following features are planned for implementation to mature the stack from a "Setup Tool" to a "Production Platform."

### Phase 1: Service Expansion
* **Knowledge Base**: Integrate a Wiki service (e.g., **BookStack** or **Outline**) with OIDC SSO.
* **CI/CD Pipeline**: Integrate **Woodpecker CI** (tightly coupled with Forgejo) to enable automated build/test pipelines for repositories.
* **Object Storage**: Deploy **MinIO** as an S3-compatible backend for Forgejo artifacts, Mattermost uploads, and system backups.

### Phase 2: Enhanced SSO & RBAC
* **Group Syncing**: Implement logic to map Keycloak Groups (e.g., "Developers", "Admins") to:
    * Forgejo Organizations/Teams.
    * Mattermost Teams/Channels.
* **Role-Based Access Control (RBAC)**: Ensure "Admin" users in Keycloak automatically receive Admin privileges in downstream services (Mattermost System Admin, Forgejo Site Admin).

### Phase 3: Manager Dashboard Evolution
* **User Management UI**: Add a "Users" tab to the Dashboard to create, delete, and modify Keycloak users without accessing the Keycloak Console.
* **Service Health Monitoring**: Implement a status page within the dashboard that pings service endpoints (`/healthz`) and reports uptime.
* **One-Click Updates**: Automate the `docker compose pull && docker compose up -d` workflow via the Manager UI to update service versions.

### Phase 4: Production Hardening
* **Backup & Restore**: Create automated scripts to dump Postgres databases and config files to an external S3 bucket (or MinIO).
* **Centralized Logging**: aggregate logs from all containers (e.g., using **Loki** and **Promtail**) and display them in **Grafana**.
* **Secret Management**: Move away from `.env` files and hardcoded secrets; implement Docker Secrets or a Vault solution.