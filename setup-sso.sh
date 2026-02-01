#!/bin/bash

# Load env variables to get the DOMAIN and PASSWORD
source .env

# Wait for Keycloak to wake up
echo "⏳ Waiting for Keycloak..."
until docker exec keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password $ADMIN_PASSWORD > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo " Ready!"

# 1. Login to Keycloak CLI
docker exec keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password $ADMIN_PASSWORD

# 2. Create the Realm 'startup-stack'
echo "Creating Realm..."
docker exec keycloak /opt/keycloak/bin/kcadm.sh create realms -s realm=startup-stack -s enabled=true || echo "Realm exists."

# 3. Create the Client 'mattermost-client'
echo "Creating Client..."
docker exec keycloak /opt/keycloak/bin/kcadm.sh create clients -r startup-stack \
  -s clientId=mattermost-client \
  -s enabled=true \
  -s clientAuthenticatorType=client-secret \
  -s secret=$MATTERMOST_CLIENT_SECRET \
  -s redirectUris="[\"http://chat.$DOMAIN/*\"]" \
  -s webOrigins="[\"+\"]" \
  -s standardFlowEnabled=true \
  -s directAccessGrantsEnabled=true \
  || echo "Client exists."

# 4. Create Mappers
# Mattermost acts like GitLab, so it expects "id" instead of "sub", and "username" instead of "preferred_username".
echo "Creating Mappers..."
CLIENT_UUID=$(docker exec keycloak /opt/keycloak/bin/kcadm.sh get clients -r startup-stack -q clientId=mattermost-client --fields id --format csv --noquotes)

# Mapper: ID
docker exec keycloak /opt/keycloak/bin/kcadm.sh create clients/$CLIENT_UUID/protocol-mappers/models -r startup-stack \
  -s name="gitlab-id" \
  -s protocol="openid-connect" \
  -s protocolMapper="oidc-usersessionmodel-note-mapper" \
  -s config."user.session.note"="userModel.id" \
  -s config."claim.name"="id" \
  -s config."jsonType.label"="String" \
  -s config."id.token.claim"="true" \
  -s config."access.token.claim"="true" \
  -s config."userinfo.token.claim"="true"

# Mapper: Username
docker exec keycloak /opt/keycloak/bin/kcadm.sh create clients/$CLIENT_UUID/protocol-mappers/models -r startup-stack \
  -s name="gitlab-username" \
  -s protocol="openid-connect" \
  -s protocolMapper="oidc-usermodel-property-mapper" \
  -s config."user.attribute"="username" \
  -s config."claim.name"="username" \
  -s config."jsonType.label"="String" \
  -s config."userinfo.token.claim"="true"

# Mapper: Email
docker exec keycloak /opt/keycloak/bin/kcadm.sh create clients/$CLIENT_UUID/protocol-mappers/models -r startup-stack \
  -s name="gitlab-email" \
  -s protocol="openid-connect" \
  -s protocolMapper="oidc-usermodel-property-mapper" \
  -s config."user.attribute"="email" \
  -s config."claim.name"="email" \
  -s config."jsonType.label"="String" \
  -s config."userinfo.token.claim"="true"

# Mapper: Name
docker exec keycloak /opt/keycloak/bin/kcadm.sh create clients/$CLIENT_UUID/protocol-mappers/models -r startup-stack \
  -s name="gitlab-name" \
  -s protocol="openid-connect" \
  -s protocolMapper="oidc-full-name-mapper" \
  -s config."id.token.claim"="true" \
  -s config."access.token.claim"="true" \
  -s config."userinfo.token.claim"="true" \
  -s config."claim.name"="name"

echo "✅ SSO Configured!"