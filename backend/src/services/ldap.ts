import ldap from 'ldapjs';

const LDAP_HOST = process.env.LDAP_HOST || 'SRV-ADDS-02.trrgroup.com';
const LDAP_PORT = parseInt(process.env.LDAP_PORT || '389');
const LDAP_BASE_DN = process.env.LDAP_BASE_DN || 'dc=trrgroup,dc=com';
const LDAP_DOMAIN = process.env.LDAP_DOMAIN || 'trrgroup';
const LDAP_SEARCH_USER = process.env.LDAP_SEARCH_USER || '';
const LDAP_SEARCH_PASSWORD = process.env.LDAP_SEARCH_PASSWORD || '';

export interface LDAPUserInfo {
  displayName: string;
  email: string;
  department: string;
  company?: string;
  companyThai?: string;
  sAMAccountName?: string;
  employeeImage?: string;
}

function createClient() {
  const client = ldap.createClient({
    url: `ldap://${LDAP_HOST}:${LDAP_PORT}`,
    timeout: 10000,
    connectTimeout: 10000,
  });
  client.on('error', (err: any) => {
    console.error('LDAP Client Error (async):', err.message || err);
  });
  return client;
}


function buildBindUser(user: string) {
  if (user.includes('\\') || user.includes('@')) return user;
  return LDAP_DOMAIN ? `${LDAP_DOMAIN}\\${user}` : user;
}

function escapeFilter(value: string) {
  return String(value)
    .replace(/\\/g, '\\5c')
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\0/g, '\\00');
}

function getAttr(entry: any, name: string) {
  if (!entry) return undefined;
  const obj = entry.object || entry;
  let value = obj[name];

  if (value === undefined && entry.attributes) {
    const attr = entry.attributes.find((a: any) => a.type === name);
    if (attr) value = attr.values;
  }

  if (Array.isArray(value)) return value[0];
  return value;
}

async function search(client: any, baseDn: string, options: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const entries: any[] = [];
    client.search(baseDn, options, (error: any, res: any) => {
      if (error) return reject(error);
      res.on('searchEntry', (entry: any) => entries.push(entry));
      res.on('error', (err: any) => reject(err));
      res.on('end', () => resolve(entries));
    });
  });
}

async function bind(client: any, dn: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function authenticateLDAP(username: string, password: string): Promise<LDAPUserInfo | null> {
  try {
    const response = await fetch('https://intra-tools.trrgroup.com/api_sys_auth/SysAuth/login_auth_emp_get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        employee_username: username,
        password: password,
        application_code: 'INTRANET'
      }).toString()
    });

    if (!response.ok) {
      console.error('API Error:', response.status);
      return null;
    }

    const text = await response.text();
    // API returns BOM, so remove it
    const cleanText = text.replace(/^\uFEFF/, '');
    const json = JSON.parse(cleanText);

    if (json.status !== 'Success' || !json.data || !json.data.auth_role_profile || json.data.auth_role_profile.length === 0) {
      return null;
    }

    const profile = json.data.auth_role_profile[0];

    return {
      displayName: profile.employee_fname_en ? `${profile.employee_fname_en} ${profile.employee_lname_en || ''}`.trim() : username,
      email: profile.employee_email || '',
      department: profile.itasset_department_name || '',
      company: profile.itasset_company_name_eng || '',
      companyThai: profile.itasset_company_name || '',
      sAMAccountName: profile.employee_username || username,
      employeeImage: profile.employee_image || ''
    };
  } catch (err) {
    console.error('API Auth Error:', err);
    return null;
  }
}

async function getDomainMaxPwdAge(client: any) {
  try {
    const entries = await search(client, LDAP_BASE_DN, {
      scope: 'base',
      attributes: ['maxPwdAge']
    });
    const maxPwdAgeTicks = getAttr(entries[0], 'maxPwdAge');
    if (maxPwdAgeTicks) {
      return Math.abs(Number(maxPwdAgeTicks));
    }
  } catch (err: any) {
    console.error('Failed to get domain maxPwdAge:', err.message);
  }
  return null;
}

export async function checkPasswordExpiry(username: string, password: string) {
  console.log(`--- [DEBUG] Check Expiry Start: User=${username} ---`);
  const client = createClient();
  try {
    const bindUser = buildBindUser(username);
    console.log(`[DEBUG] Attempting bind with user: ${bindUser}`);
    await bind(client, bindUser, password);
    console.log(`[DEBUG] Bind successful for: ${bindUser}`);

    const accountName = username.includes('\\') ? username.split('\\').pop() : username.split('@')[0];
    const safeUsername = escapeFilter(accountName || '');
    console.log(`[DEBUG] Searching for AD entry with accountName: ${accountName}`);

    const entries = await search(client, LDAP_BASE_DN, {
      scope: 'sub',
      filter: `(|(sAMAccountName=${safeUsername})(cn=${safeUsername})(name=${safeUsername}))`,
      attributes: ['*', '+', 'msDS-UserPasswordExpiryTimeComputed']
    });

    console.log(`[DEBUG] Found ${entries.length} entries for search.`);

    const entry = entries[0];
    if (!entry) {
      console.error(`[DEBUG] No AD entry found for safeUsername: ${safeUsername}`);
      throw new Error('User not found in AD');
    }

    const userObj = entry.object;
    const pwdLastSet = getAttr(entry, 'pwdLastSet');
    const uac = getAttr(entry, 'userAccountControl');
    let expiryTimeTicks = getAttr(entry, 'msDS-UserPasswordExpiryTimeComputed');

    console.log(`[DEBUG] Raw AD attributes: pwdLastSet=${pwdLastSet}, UAC=${uac}, ExpiryTicks=${expiryTimeTicks}`);
    console.log(`[DEBUG] User Object Keys: ${Object.keys(userObj || {}).join(', ')}`);

    const isUacNeverExpires = (parseInt(uac) & 0x10000) !== 0;

    if (!expiryTimeTicks || expiryTimeTicks === '0' || expiryTimeTicks === '9223372036854775807') {
      if (!isUacNeverExpires && pwdLastSet && pwdLastSet !== '0') {
        const maxPwdAge = await getDomainMaxPwdAge(client);
        if (maxPwdAge) {
          expiryTimeTicks = (BigInt(pwdLastSet) + BigInt(maxPwdAge)).toString();
        }
      }
    }

    if (pwdLastSet === '0') {
      return {
        expires: true,
        daysRemaining: 0,
        message: 'You must change your password at next logon.'
      };
    }

    const neverExpires = !expiryTimeTicks || expiryTimeTicks === '0' || expiryTimeTicks === '9223372036854775807' || isUacNeverExpires;

    if (neverExpires && (!expiryTimeTicks || expiryTimeTicks === '0' || expiryTimeTicks === '9223372036854775807')) {
      return {
        expires: false,
        daysRemaining: 9999,
        message: 'Your password is set to never expire.'
      };
    }

    const expiryMs = (Number(expiryTimeTicks) / 10000) - 11644473600000;
    const expiryDate = new Date(expiryMs);
    const now = new Date();
    
    const expiryDateReset = new Date(expiryDate);
    expiryDateReset.setHours(0, 0, 0, 0);
    const nowReset = new Date(now);
    nowReset.setHours(0, 0, 0, 0);

    const diffTime = expiryDateReset.getTime() - nowReset.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    return {
      expires: true,
      expiryDate: expiryDate.toISOString(),
      daysRemaining: diffDays,
      message: diffDays > 0
        ? `Your password will expire in ${diffDays} days (${expiryDate.toLocaleDateString('th-TH')}).`
        : diffDays === 0
          ? `Your password expires today!`
          : `Your password has expired ${Math.abs(diffDays)} days ago.`
    };
  } finally {
    try { client.unbind(); } catch (_) {}
  }
}

export async function searchADUsers(query: string): Promise<any[]> {
  const client = createClient();
  const searchBindUser = buildBindUser(LDAP_SEARCH_USER);

  try {
    await bind(client, searchBindUser, LDAP_SEARCH_PASSWORD);

    const safeKeyword = escapeFilter(query);
    const entries = await search(client, LDAP_BASE_DN, {
      scope: 'sub',
      filter: `(&(objectClass=user)(|(sAMAccountName=*${safeKeyword}*)(cn=*${safeKeyword}*)(displayName=*${safeKeyword}*)(mail=*${safeKeyword}*)))`,
      attributes: ['sAMAccountName', 'displayName', 'mail', 'department', 'company'],
      sizeLimit: 50,
    });

    return entries.map(entry => {
      const obj = entry.object;
      return {
        adUsername: obj.sAMAccountName,
        displayName: obj.displayName || '',
        email: obj.mail || '',
        department: obj.department || '',
        company: obj.company || '',
      };
    });
  } finally {
    try { client.unbind(); } catch (_) {}
  }
}

export async function getAllADCompanies(): Promise<string[]> {
  const client = createClient();
  const searchBindUser = buildBindUser(LDAP_SEARCH_USER);
  try {
    await bind(client, searchBindUser, LDAP_SEARCH_PASSWORD);

    const entries = await search(client, LDAP_BASE_DN, {
      scope: 'sub',
      filter: `(&(objectClass=user)(company=*))`,
      attributes: ['company'],
      sizeLimit: 5000,
    });

    const companySet = new Set<string>();
    for (const entry of entries) {
      if (entry.object && entry.object.company) {
        let companies = entry.object.company;
        if (!Array.isArray(companies)) {
          companies = [companies];
        }
        for (const c of companies) {
          if (c && typeof c === 'string' && c.trim()) {
            companySet.add(c.trim());
          }
        }
      }
    }

    return Array.from(companySet).sort();
  } catch (err) {
    console.error('LDAP Get Companies Error:', err);
    return [];
  } finally {
    try { client.unbind(); } catch (_) {}
  }
}
