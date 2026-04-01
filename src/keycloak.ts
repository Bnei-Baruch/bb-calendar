import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://accounts.kab.info/auth/',
  realm: 'main',
  clientId: 'events',
});

export default keycloak;
