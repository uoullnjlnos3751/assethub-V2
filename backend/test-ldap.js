const ldap = require('ldapjs');
const client = ldap.createClient({ url: 'ldap://SRV-ADDS-02.trrgroup.com:389' });
client.bind('trrgroup\\watchara.kid', 'Jack@3751', (err) => {
  if (err) {
    console.error('Bind failed:', err.message);
  } else {
    console.log('Bind successful!');
  }
  client.unbind();
});
