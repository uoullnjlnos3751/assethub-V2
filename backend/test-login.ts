process.env.LDAP_HOST = 'SRV-ADDS-02.trrgroup.com';
process.env.LDAP_PORT = '389';
process.env.LDAP_BASE_DN = 'dc=trrgroup,dc=com';
process.env.LDAP_DOMAIN = 'trrgroup';
process.env.LDAP_SEARCH_USER = 'watchara.kid';
process.env.LDAP_SEARCH_PASSWORD = 'Jack@3751';

import { AuthService } from './src/services/auth.service';

AuthService.login('watchara.kid', 'Jack@3751')
  .then(res => {
    console.log('Login Success:', res.user.adUsername);
    process.exit(0);
  })
  .catch(e => {
    console.error('Login Failed:', e.message);
    process.exit(1);
  });
