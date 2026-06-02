const GLPI_BASE_URL = 'http://10.100.77.229/glpi/apirest.php';
const USER_TOKEN = 'P1e94q3AktogH4KPhYIZyHquhUZxvnJyBKA0d5P4';
const APP_TOKEN = 'onhC08v7Cmy5zJFln9i1EHrYNAOdOAZok6BYT6Ml';

export async function fetchGLPISpecBySerial(serialNumber: string) {
  if (!serialNumber) return null;

  try {
    // 1. Initialize Session
    const initRes = await fetch(`${GLPI_BASE_URL}/initSession`, {
      method: 'GET',
      headers: {
        'App-Token': APP_TOKEN,
        'Authorization': `user_token ${USER_TOKEN}`,
      },
    });

    if (!initRes.ok) {
      throw new Error(`Failed to initialize GLPI session: ${initRes.statusText}`);
    }

    const { session_token } = await initRes.json() as { session_token: string };

    const glpiFetch = async (url: string) => {
      try {
        const res = await fetch(url, {
          headers: {
            'App-Token': APP_TOKEN,
            'Session-Token': session_token,
          },
        });
        return res.ok ? res.json() : null;
      } catch (err) {
        console.error(`GLPI Fetch failed for ${url}:`, err);
        return null;
      }
    };

    // 2. Search Computer by Serial Number using precise search endpoint
    const searchRes = await glpiFetch(`${GLPI_BASE_URL}/search/Computer?criteria[0][field]=5&criteria[0][searchtype]=equals&criteria[0][value]=${serialNumber}&forcedisplay[0]=2`) as any;
    if (!searchRes || !searchRes.data || !Array.isArray(searchRes.data) || searchRes.data.length === 0) {
      return null;
    }

    const computerId = searchRes.data[0]["2"];
    if (!computerId) {
      return null;
    }

    // Fetch full computer details by exact ID
    const computer = await glpiFetch(`${GLPI_BASE_URL}/Computer/${computerId}`) as any;
    if (!computer) {
      return null;
    }

    let glpiUser = '';
    if (computer.users_id) {
      const userRes = await glpiFetch(`${GLPI_BASE_URL}/User/${computer.users_id}`) as any;
      if (userRes) {
        glpiUser = userRes.realname && userRes.firstname 
          ? `${userRes.firstname} ${userRes.realname}` 
          : (userRes.name || computer.contact || '');
      }
    } else if (computer.contact) {
      glpiUser = computer.contact;
    }

    // 3. Fetch CPU details
    const processors = await glpiFetch(`${GLPI_BASE_URL}/Computer/${computerId}/Item_DeviceProcessor`) as any[];
    let cpuName = '';
    let cpuCores = 0;
    if (processors && processors.length > 0) {
      const proc = processors[0];
      cpuCores = proc.nbcores || 0;
      const devProcLink = proc.links?.find((l: any) => l.rel === 'DeviceProcessor');
      if (devProcLink) {
        const devProc = await glpiFetch(devProcLink.href) as any;
        if (devProc) {
          cpuName = devProc.designation || devProc.designation || devProc.name || '';
        }
      }
    }

    // 4. Fetch RAM details
    const memories = await glpiFetch(`${GLPI_BASE_URL}/Computer/${computerId}/Item_DeviceMemory`) as any[];
    let totalRamMb = 0;
    if (memories && memories.length > 0) {
      totalRamMb = memories.reduce((sum: number, m: any) => sum + (m.size || 0), 0);
    }
    const totalRamGb = Math.round(totalRamMb / 1024);

    // 5. Fetch OS details
    const operatingSystems = await glpiFetch(`${GLPI_BASE_URL}/Computer/${computerId}/Item_OperatingSystem`) as any[];
    let osName = '';
    let osVersion = '';
    let osLicense = '';
    if (operatingSystems && operatingSystems.length > 0) {
      const osItem = operatingSystems[0];
      osLicense = osItem.license_number || '';
      
      const osLink = osItem.links?.find((l: any) => l.rel === 'OperatingSystem');
      if (osLink) {
        const os = await glpiFetch(osLink.href) as any;
        if (os) osName = os.name || '';
      }

      const versionLink = osItem.links?.find((l: any) => l.rel === 'OperatingSystemVersion');
      if (versionLink) {
        const ver = await glpiFetch(versionLink.href) as any;
        if (ver) osVersion = ver.name || '';
      }
    }

    // 6. Fetch Software details for MS Office & Antivirus
    const softwareItems = await glpiFetch(`${GLPI_BASE_URL}/Computer/${computerId}/Item_SoftwareVersion`) as any[];
    let msOffice = '';
    let antivirus = '';

    if (softwareItems && Array.isArray(softwareItems) && softwareItems.length > 0) {
      const softwareCache: Record<string, any> = {};
      const getSoftwareCached = async (url: string) => {
        if (softwareCache[url]) return softwareCache[url];
        const promise = glpiFetch(url);
        softwareCache[url] = promise;
        return promise;
      };

      const softwareDetails = await Promise.all(
        softwareItems.map(async (item: any) => {
          const softVerLink = item.links?.find((l: any) => l.rel === 'SoftwareVersion');
          if (!softVerLink) return null;

          const versionObj = await glpiFetch(softVerLink.href) as any;
          if (!versionObj) return null;

          const softLink = versionObj.links?.find((l: any) => l.rel === 'Software');
          if (!softLink) {
            return { name: '', version: versionObj.name || '' };
          }

          const softObj = await getSoftwareCached(softLink.href) as any;
          return {
            name: softObj ? softObj.name : '',
            version: versionObj.name || '',
          };
        })
      );

      const msOfficeKeywords = ['microsoft office', 'office 16', 'office 365', 'o365', 'microsoft 365', 'ms office'];
      const antivirusKeywords = ['trend micro', 'antivirus', 'kaspersky', 'sophos', 'symantec', 'mcafee', 'defender', 'bitdefender', 'apex one', 'malwarebytes', 'norton', 'cortex xdr', 'crowdstrike'];

      const detectedOffice = new Set<string>();
      const detectedAntivirus = new Set<string>();

      const normalizeOffice = (name: string): string => {
        const lower = name.toLowerCase();
        if (lower.includes('365')) return 'Microsoft 365 Apps';
        if (lower.includes('2021')) return 'Microsoft Office 2021';
        if (lower.includes('2019')) return 'Microsoft Office 2019';
        if (lower.includes('2016')) return 'Microsoft Office 2016';
        if (lower.includes('2013')) return 'Microsoft Office 2013';
        return name; // fallback
      };

      const normalizeAntivirus = (name: string): string => {
        const lower = name.toLowerCase();
        if (lower.includes('trend micro') || lower.includes('apex one')) return 'Trend Micro Apex One';
        if (lower.includes('eset endpoint security')) return 'ESET Endpoint Security';
        if (lower.includes('eset')) return 'ESET';
        if (lower.includes('sangfor')) return 'Sangfor Endpoint Secure';
        if (lower.includes('kaspersky')) return 'Kaspersky';
        if (lower.includes('sophos')) return 'Sophos';
        if (lower.includes('symantec')) return 'Symantec';
        if (lower.includes('mcafee')) return 'McAfee';
        if (lower.includes('defender')) return 'Windows Defender';
        if (lower.includes('bitdefender')) return 'Bitdefender';
        if (lower.includes('cortex')) return 'Cortex XDR';
        if (lower.includes('crowdstrike')) return 'CrowdStrike';
        return name; // fallback
      };

      for (const app of softwareDetails) {
        if (!app || !app.name) continue;
        const lowerName = app.name.toLowerCase();
        
        const isOffice = msOfficeKeywords.some(kw => lowerName.includes(kw));
        const isAntivirus = antivirusKeywords.some(kw => lowerName.includes(kw));

        if (isOffice) {
          detectedOffice.add(normalizeOffice(app.name));
        }
        if (isAntivirus) {
          detectedAntivirus.add(normalizeAntivirus(app.name));
        }
      }

      if (detectedOffice.size > 0) {
        msOffice = Array.from(detectedOffice).join(', ');
      }
      if (detectedAntivirus.size > 0) {
        antivirus = Array.from(detectedAntivirus).join(', ');
      }
    }

    // Close session
    await fetch(`${GLPI_BASE_URL}/killSession`, {
      method: 'GET',
      headers: {
        'App-Token': APP_TOKEN,
        'Session-Token': session_token,
      },
    });

    return {
      computerId,
      name: computer.name,
      serial: computer.serial,
      cpu: cpuName ? `${cpuName} (${cpuCores} Cores)` : '',
      ram: totalRamGb ? `${totalRamGb} GB` : '',
      os: osName ? `${osName} ${osVersion}`.trim() : '',
      license: osLicense,
      msOffice: msOffice || '',
      antivirus: antivirus || '',
      user: glpiUser || '',
    };
  } catch (error) {
    console.error('Error fetching GLPI spec:', error);
    return null;
  }
}

