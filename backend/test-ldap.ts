import { authenticateLDAP } from './src/services/ldap';
import { config } from 'dotenv';
config();

authenticateLDAP('watchara.kid', 'Jack@3751')
  .then(res => {
    console.log('LDAP Result:', res);
    process.exit(0);
  })
  .catch(err => {
    console.error('LDAP Error:', err);
    process.exit(1);
  });
