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
  thaiName?: string;
  sAMAccountName?: string;
  employeeImage?: string;
}

export function isLdapConfigured(): boolean {
  return !!(LDAP_HOST && LDAP_SEARCH_USER && LDAP_SEARCH_PASSWORD);
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
  // 1. Verify password via LDAP bind
  try {
    const client = createClient();
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('error', (err: any) => reject(err));
      setTimeout(() => reject(new Error('LDAP connect timeout')), 10000);
    });
    const bindDn = buildBindUser(username);
    console.log(`[LDAP] Attempting bind: ${bindDn}`);
    await bind(client, bindDn, password);
    console.log(`[LDAP] Bind OK for ${username}`);
    client.destroy();
  } catch (err: any) {
    console.error(`[LDAP] Bind FAILED for ${username}:`, err.message || err);
    return null;
  }

  // 2. Fetch profile from Employee API
  try {
    const response = await fetch(
      `https://intra-serv.trrgroup.com/api_intranet/Employee/Employee_Get?show_profile=Y&employee_username=${encodeURIComponent(username)}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      console.error('Employee API Error:', response.status);
      return null;
    }
    const json = await response.json() as any;
    if (json.status !== 'Success' || !Array.isArray(json.data) || json.data.length === 0) {
      return null;
    }

    const profile = json.data[0];

    if (!profile.employee_username || profile.employee_username.toLowerCase() !== username.toLowerCase()) {
      return null;
    }

    return {
      displayName: profile.employee_fname_en
        ? `${profile.employee_fname_en} ${profile.employee_lname_en || ''}`.trim()
        : username,
      email: profile.employee_email || '',
      department: profile.itasset_department_name || '',
      company: profile.itasset_company_name_eng || profile.itasset_company_name || '',
      companyThai: profile.itasset_company_name || '',
      thaiName: profile.fullname_th || (profile.employee_fname_th ? `${profile.employee_fname_th} ${profile.employee_lname_th || ''}`.trim() : ''),
      sAMAccountName: profile.employee_username || username,
      employeeImage: profile.employee_url || ''
    };
  } catch (err) {
    console.error('Employee API Error:', err);
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
  if (!isLdapConfigured()) {
    return {
      expires: false,
      daysRemaining: 9999,
      message: 'ไม่สามารถตรวจสอบผ่าน AD Direct (ไม่ได้กำหนด LDAP Search User)'
    };
  }

  const client = createClient();
  try {
    const bindUser = buildBindUser(username);
    await bind(client, bindUser, password);

    const accountName = username.includes('\\') ? username.split('\\').pop() : username.split('@')[0];
    const safeUsername = escapeFilter(accountName || '');

    const entries = await search(client, LDAP_BASE_DN, {
      scope: 'sub',
      filter: `(|(sAMAccountName=${safeUsername})(cn=${safeUsername})(name=${safeUsername}))`,
      attributes: ['*', '+', 'msDS-UserPasswordExpiryTimeComputed']
    });

    const entry = entries[0];
    if (!entry) {
      return {
        expires: false,
        daysRemaining: 9999,
        message: 'ไม่พบผู้ใช้ใน Active Directory'
      };
    }

    const pwdLastSet = getAttr(entry, 'pwdLastSet');
    const uac = getAttr(entry, 'userAccountControl');
    let expiryTimeTicks = getAttr(entry, 'msDS-UserPasswordExpiryTimeComputed');

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
  } catch (err: any) {
    const isBindError = err.message?.includes('bind') || err.message?.includes('000004DC') || err.message?.includes('credentials') || err.message?.includes('LDAP_INVALID_CREDENTIALS');
    console.error('LDAP checkPasswordExpiry error:', isBindError ? 'Bind failed (possibly wrong password or LDAP unreachable)' : err.message);
    return {
      expires: false,
      daysRemaining: 9999,
      message: isBindError
        ? 'ไม่สามารถตรวจสอบวันหมดอายุรหัสผ่านได้ (กรุณาลองใหม่อีกครั้ง)'
        : 'เกิดข้อผิดพลาดในการเชื่อมต่อ AD กรุณาลองใหม่อีกครั้ง'
    };
  } finally {
    try { client.unbind(); } catch (_) {}
  }
}

export async function searchADUsers(query: string): Promise<any[]> {
  if (!isLdapConfigured()) {
    console.warn('LDAP not configured — searchADUsers skipped');
    return [];
  }

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
  } catch (err: any) {
    console.error('LDAP searchADUsers error:', err.message || err);
    return [];
  } finally {
    try { client.unbind(); } catch (_) {}
  }
}

export async function getAllADCompanies(): Promise<string[]> {
  if (!isLdapConfigured()) {
    console.warn('LDAP not configured — getAllADCompanies skipped');
    return [];
  }

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
  } catch (err: any) {
    console.error('LDAP getAllADCompanies error:', err.message || err);
    return [];
  } finally {
    try { client.unbind(); } catch (_) {}
  }
}

export async function getAllADDepartments(): Promise<string[]> {
  if (!isLdapConfigured()) {
    console.warn('LDAP not configured — getAllADDepartments skipped');
    return [];
  }

  const client = createClient();
  const searchBindUser = buildBindUser(LDAP_SEARCH_USER);
  try {
    await bind(client, searchBindUser, LDAP_SEARCH_PASSWORD);

    const entries = await search(client, LDAP_BASE_DN, {
      scope: 'sub',
      filter: `(&(objectClass=user)(department=*))`,
      attributes: ['department'],
      sizeLimit: 5000,
    });

    const departmentSet = new Set<string>();
    for (const entry of entries) {
      if (entry.object && entry.object.department) {
        let departments = entry.object.department;
        if (!Array.isArray(departments)) {
          departments = [departments];
        }
        for (const d of departments) {
          if (d && typeof d === 'string' && d.trim()) {
            departmentSet.add(d.trim());
          }
        }
      }
    }

    return Array.from(departmentSet).sort();
  } catch (err: any) {
    console.error('LDAP getAllADDepartments error:', err.message || err);
    return [];
  } finally {
    try { client.unbind(); } catch (_) {}
  }
}
