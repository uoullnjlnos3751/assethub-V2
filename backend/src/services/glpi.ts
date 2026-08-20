import { prisma } from '../lib/prisma';
const GLPI_BASE_URL = process.env.GLPI_API_URL || 'http://10.100.77.229/glpi/apirest.php';
const USER_TOKEN = process.env.GLPI_USER_TOKEN || '';
const APP_TOKEN = process.env.GLPI_APP_TOKEN || '';

if (!USER_TOKEN || !APP_TOKEN) {
  console.warn('GLPI_USER_TOKEN or GLPI_APP_TOKEN is not set. GLPI integration will not work.');
}

/**
 * ดึงสเปคเครื่องจาก GLPI ด้วย Serial
 *
 * `hostCompany` คือบริษัทของเครื่องในทะเบียน ITSM — ต้องส่งเข้ามาเพราะ GLPI
 * บอกบริษัทไม่ได้เลย: Computer ไม่มีฟิลด์ company และทั้งระบบอยู่ Root Entity
 * เดียว (entities_id = 0) ก่อนหน้านี้โค้ดอ่าน `computer.company` ที่ไม่มีอยู่จริง
 * แล้วตกไปใช้ค่าคงที่ 'TRR HQ' ซึ่งไม่ใช่รหัสบริษัทของที่นี่สักตัว
 */
export async function fetchGLPISpecBySerial(serialNumber: string, hostCompany?: string | null) {
  const serial = serialNumber?.trim();
  if (!serial) return null;

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
      console.error(`GLPI Session Init Failed: ${initRes.status} ${initRes.statusText}`);
      const errText = await initRes.text();
      console.error(`Error body: ${errText}`);
      throw new Error(`Failed to initialize GLPI session: ${initRes.statusText}`);
    }

    const { session_token } = await initRes.json() as { session_token: string };
    console.log(`GLPI Session Initialized: ${session_token}`);

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

    // Fetch list endpoints with full range (bypass default 20-item limit)
    const glpiFetchList = async (url: string) => {
      try {
        const separator = url.includes('?') ? '&' : '?';
        const fullUrl = `${url}${separator}range=0-9999`;
        const res = await fetch(fullUrl, {
          headers: {
            'App-Token': APP_TOKEN,
            'Session-Token': session_token,
            'Range': '0-9999',
          },
        });
        return res.ok ? res.json() : null;
      } catch (err) {
        console.error(`GLPI Fetch list failed for ${url}:`, err);
        return null;
      }
    };

    // 2. Search Computer by Serial Number using precise search endpoint
    const searchUrl = new URL(`${GLPI_BASE_URL}/search/Computer`);
    searchUrl.searchParams.set('criteria[0][field]', '5');
    searchUrl.searchParams.set('criteria[0][searchtype]', 'equals');
    searchUrl.searchParams.set('criteria[0][value]', serial);
    searchUrl.searchParams.set('forcedisplay[0]', '2');
    const searchRes = await glpiFetch(searchUrl.toString()) as any;
    if (!searchRes || !searchRes.data || !Array.isArray(searchRes.data) || searchRes.data.length === 0) {
      return null;
    }

    const computerId = searchRes.data[0]["2"];
    if (!computerId) {
      return null;
    }

    // Fetch full computer details with expand_dropdowns to get location, domain, type as names
    const computer = await glpiFetch(`${GLPI_BASE_URL}/Computer/${computerId}?expand_dropdowns=true`) as any;
    if (!computer) {
      return null;
    }

    // Fetch brand/manufacturer
    let brand = '';
    const manufLink = computer.links?.find((l: any) => l.rel === 'Manufacturer');
    if (manufLink) {
      const manuf = await glpiFetch(manufLink.href) as any;
      if (manuf) brand = manuf.name || '';
    }

    // Fetch model
    let model = '';
    const modelLink = computer.links?.find((l: any) => l.rel === 'ComputerModel');
    if (modelLink) {
      const mdl = await glpiFetch(modelLink.href) as any;
      if (mdl) model = mdl.name || '';
    }

    let glpiUser = '';
    const userLink = computer.links?.find((l: any) => l.rel === 'User');
    if (userLink) {
      const userRes = await glpiFetch(userLink.href) as any;
      if (userRes) {
        glpiUser = userRes.realname && userRes.firstname 
          ? `${userRes.firstname} ${userRes.realname}` 
          : (userRes.name || computer.contact || '');
      }
    }

    if (!glpiUser && computer.users_id) {
      // With expand_dropdowns, users_id might already be a name string
      if (typeof computer.users_id === 'string' && isNaN(Number(computer.users_id))) {
        glpiUser = computer.users_id;
      } else {
        const userRes = await glpiFetch(`${GLPI_BASE_URL}/User/${computer.users_id}`) as any;
        if (userRes) {
          glpiUser = userRes.realname && userRes.firstname 
            ? `${userRes.firstname} ${userRes.realname}` 
            : (userRes.name || computer.contact || '');
        }
      }
    }
    
    if (!glpiUser && computer.contact) {
      glpiUser = computer.contact;
    }

    // Extract location and domain from expand_dropdowns result
    let glpiLocation = '';
    if (computer.locations_id && typeof computer.locations_id === 'string' && isNaN(Number(computer.locations_id))) {
      glpiLocation = computer.locations_id;
    } else if (computer.locations_id && Number(computer.locations_id) > 0) {
      const loc = await glpiFetch(`${GLPI_BASE_URL}/Location/${computer.locations_id}`) as any;
      if (loc) glpiLocation = loc.completename || loc.name || '';
    }

    let glpiDomain = '';
    if (computer.domains_id && typeof computer.domains_id === 'string' && isNaN(Number(computer.domains_id))) {
      glpiDomain = computer.domains_id;
    } else if (computer.domains_id && Number(computer.domains_id) > 0) {
      const dom = await glpiFetch(`${GLPI_BASE_URL}/Domain/${computer.domains_id}`) as any;
      if (dom) glpiDomain = dom.name || '';
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
          cpuName = devProc.designation || devProc.name || '';
        }
      }
    }

    // 4. Fetch RAM details (total + per-slot)
    const memories = await glpiFetch(`${GLPI_BASE_URL}/Computer/${computerId}/Item_DeviceMemory`) as any[];
    let totalRamMb = 0;
    let ramSlot1 = '';
    let ramSlot2 = '';
    if (memories && memories.length > 0) {
      totalRamMb = memories.reduce((sum: number, m: any) => sum + (m.size || 0), 0);

      // Get per-slot details
      for (let i = 0; i < Math.min(memories.length, 2); i++) {
        const mem = memories[i];
        const sizeMb = mem.size || 0;
        const sizeGb = sizeMb >= 1024 ? `${Math.round(sizeMb / 1024)} GB` : `${sizeMb} MB`;
        
        // Try to get memory type designation (DDR4, DDR5, etc.)
        let memType = '';
        const devMemLink = mem.links?.find((l: any) => l.rel === 'DeviceMemory');
        if (devMemLink) {
          const devMem = await glpiFetch(devMemLink.href) as any;
          if (devMem) {
            memType = devMem.designation || devMem.name || '';
          }
        }
        
        const slotInfo = memType ? `${memType} ${sizeGb}` : sizeGb;
        if (i === 0) ramSlot1 = slotInfo;
        if (i === 1) ramSlot2 = slotInfo;
      }
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

    // Derive OS Type from OS name
    let osType = '';
    const osFullName = `${osName} ${osVersion}`.toLowerCase();
    if (osFullName.includes('windows')) osType = 'Windows';
    else if (osFullName.includes('macos') || osFullName.includes('mac os') || osFullName.includes('os x')) osType = 'macOS';
    else if (osFullName.includes('linux') || osFullName.includes('ubuntu') || osFullName.includes('centos') || osFullName.includes('debian') || osFullName.includes('redhat') || osFullName.includes('fedora')) osType = 'Linux';
    else if (osFullName.includes('chrome')) osType = 'ChromeOS';
    else if (osFullName.includes('android')) osType = 'Android';
    else if (osFullName.includes('ios')) osType = 'iOS';

    // 6. Fetch Storage (Hard Drive) details
    const hardDrives = await glpiFetch(`${GLPI_BASE_URL}/Computer/${computerId}/Item_DeviceHardDrive`) as any[];
    let storage1 = '';
    let storage2 = '';
    if (hardDrives && hardDrives.length > 0) {
      for (let i = 0; i < Math.min(hardDrives.length, 2); i++) {
        const hd = hardDrives[i];
        const capacityMb = hd.capacity || 0;
        let capacityStr = '';
        if (capacityMb >= 1024) {
          const gb = Math.round(capacityMb / 1024);
          capacityStr = gb >= 1000 ? `${(gb / 1024).toFixed(1)} TB` : `${gb} GB`;
        } else if (capacityMb > 0) {
          capacityStr = `${capacityMb} MB`;
        }
        
        // Get drive designation/model
        let driveModel = '';
        const devHdLink = hd.links?.find((l: any) => l.rel === 'DeviceHardDrive');
        if (devHdLink) {
          const devHd = await glpiFetch(devHdLink.href) as any;
          if (devHd) {
            driveModel = devHd.designation || devHd.name || '';
          }
        }
        
        // Determine drive type (SSD/HDD) from model name
        let driveType = '';
        const modelLower = (driveModel || '').toLowerCase();
        if (modelLower.includes('ssd') || modelLower.includes('nvme') || modelLower.includes('solid state') || modelLower.includes('m.2')) {
          driveType = 'SSD';
        } else if (modelLower.includes('hdd') || modelLower.includes('hard disk') || modelLower.includes('mechanical')) {
          driveType = 'HDD';
        }
        
        let storageInfo = '';
        if (driveType && capacityStr) {
          storageInfo = `${driveType} ${capacityStr}`;
        } else if (driveModel && capacityStr) {
          storageInfo = `${driveModel} ${capacityStr}`;
        } else if (capacityStr) {
          storageInfo = capacityStr;
        } else if (driveModel) {
          storageInfo = driveModel;
        }
        
        if (i === 0) storage1 = storageInfo;
        if (i === 1) storage2 = storageInfo;
      }
    }

    // 7. Fetch GPU (Graphic Card) details
    const graphicCards = await glpiFetch(`${GLPI_BASE_URL}/Computer/${computerId}/Item_DeviceGraphicCard`) as any[];
    let gpu = '';
    if (graphicCards && graphicCards.length > 0) {
      const gc = graphicCards[0];
      const vramMb = gc.memory || 0;
      
      let gpuDesignation = '';
      const devGcLink = gc.links?.find((l: any) => l.rel === 'DeviceGraphicCard');
      if (devGcLink) {
        const devGc = await glpiFetch(devGcLink.href) as any;
        if (devGc) {
          gpuDesignation = devGc.designation || devGc.name || '';
        }
      }
      
      if (gpuDesignation && vramMb > 0) {
        const vramGb = vramMb >= 1024 ? `${Math.round(vramMb / 1024)} GB` : `${vramMb} MB`;
        gpu = `${gpuDesignation} (${vramGb})`;
      } else if (gpuDesignation) {
        gpu = gpuDesignation;
      }
    }

    // 8. Fetch Network Port details (MAC + IP)
    const networkPorts = await glpiFetch(`${GLPI_BASE_URL}/Computer/${computerId}/NetworkPort`) as any[];
    let macAddress = '';
    let ipAddress = '';
    if (networkPorts && Array.isArray(networkPorts) && networkPorts.length > 0) {
      // Find the first port with a MAC address (prefer Ethernet over WiFi)
      const ethernetPort = networkPorts.find((p: any) => 
        p.instantiation_type === 'NetworkPortEthernet' && p.mac
      );
      const firstPortWithMac = ethernetPort || networkPorts.find((p: any) => p.mac);
      
      if (firstPortWithMac) {
        macAddress = firstPortWithMac.mac || '';
        
        // Try to get IP from NetworkName -> IPAddress chain
        try {
          const networkNames = await glpiFetch(
            `${GLPI_BASE_URL}/NetworkPort/${firstPortWithMac.id}/NetworkName`
          ) as any[];
          if (networkNames && Array.isArray(networkNames) && networkNames.length > 0) {
            const ipAddresses = await glpiFetch(
              `${GLPI_BASE_URL}/NetworkName/${networkNames[0].id}/IPAddress`
            ) as any[];
            if (ipAddresses && Array.isArray(ipAddresses) && ipAddresses.length > 0) {
              ipAddress = ipAddresses[0].name || '';
            }
          }
        } catch {
          // IP fetch chain failed, continue without IP
        }
      }
    }

    // 9. Fetch Software details for MS Office & Antivirus
    // Implement global in-memory caching for Software and SoftwareVersions to avoid 504 Gateway Timeouts
    // We fetch the entire dictionary every 1 hour, this takes ~8s once and makes all subsequent lookups take ~1ms.
    const CACHE_TTL = 1000 * 60 * 60; // 1 hour
    const globalObj = global as any;

    if (!globalObj.glpiSoftwareCacheTime || (Date.now() - globalObj.glpiSoftwareCacheTime) > CACHE_TTL) {
      console.log('Refreshing GLPI Software global cache...');
      try {
        const swRes = await fetch(`${GLPI_BASE_URL}/Software?range=0-99999`, {
          headers: { 'App-Token': APP_TOKEN, 'Session-Token': session_token },
        });
        const swData = await swRes.json() as any[];

        const svRes = await fetch(`${GLPI_BASE_URL}/SoftwareVersion?range=0-999999`, {
          headers: { 'App-Token': APP_TOKEN, 'Session-Token': session_token },
        });
        const svData = await svRes.json() as any[];

        const swMap = new Map();
        if (Array.isArray(swData)) swData.forEach(s => swMap.set(String(s.id), s));
        const svMap = new Map();
        if (Array.isArray(svData)) svData.forEach(s => svMap.set(String(s.id), s));

        globalObj.glpiSoftwareMap = swMap;
        globalObj.glpiSoftwareVersionMap = svMap;
        globalObj.glpiSoftwareCacheTime = Date.now();
        console.log(`Cached ${swMap.size} Software and ${svMap.size} SoftwareVersions`);
      } catch (err) {
        console.error('Failed to refresh GLPI Software cache:', err);
      }
    }

    const softwareItems = await glpiFetchList(`${GLPI_BASE_URL}/Computer/${computerId}/Item_SoftwareVersion`) as any[];
    let msOffice = '';
    let antivirus = '';

    if (softwareItems && Array.isArray(softwareItems) && softwareItems.length > 0 && globalObj.glpiSoftwareMap && globalObj.glpiSoftwareVersionMap) {
      const swMap = globalObj.glpiSoftwareMap;
      const svMap = globalObj.glpiSoftwareVersionMap;

      const softwareDetails = softwareItems.map((item: any) => {
        let svId = item.softwareversions_id;
        if (!svId && item.links) {
          const l = item.links.find((x: any) => x.rel === 'SoftwareVersion');
          if (l) svId = l.href.split('/').pop();
        }
        
        const verObj = svMap.get(String(svId));
        if (!verObj) return null;
        
        const softObj = swMap.get(String(verObj.softwares_id));
        return {
          name: softObj ? softObj.name : '',
          version: verObj.name || '',
        };
      }).filter(Boolean);

      const msOfficeKeywords = ['microsoft office', 'office 16', 'office 365', 'o365', 'microsoft 365', 'ms office', 'office home', 'office standard', 'office professional', 'office business'];
      const antivirusKeywords = ['trend micro', 'antivirus', 'kaspersky', 'sophos', 'symantec', 'mcafee', 'defender', 'bitdefender', 'apex one', 'malwarebytes', 'norton', 'cortex xdr', 'crowdstrike'];

      const detectedOffice = new Set<string>();
      const detectedAntivirus = new Set<string>();

      // Ignore junk/helper components for MS Office
      const isOfficeJunk = (name: string): boolean => {
        const lower = name.toLowerCase();
        return lower.includes('click-to-run') ||
               lower.includes('extensibility') ||
               lower.includes('licensing component') ||
               lower.includes('language pack') ||
               lower.includes('proofing tools') ||
               lower.includes('add-in') ||
               lower.includes('actions server') ||
               lower.includes('actionsserver') ||
               lower.includes('notificationsutility') ||
               lower.includes('local ai manager') ||
               lower.includes('mui (');
      };

      const normalizeOffice = (name: string): string => {
        const lower = name.toLowerCase();
        if (lower.includes('home and business') && lower.includes('2021')) return 'Microsoft Office Home & Business 2021';
        if (lower.includes('home and business') && lower.includes('2019')) return 'Microsoft Office Home & Business 2019';
        if (lower.includes('home and business') && lower.includes('2016')) return 'Microsoft Office Home & Business 2016';
        if (lower.includes('home and student') && lower.includes('2021')) return 'Microsoft Office Home & Student 2021';
        if (lower.includes('professional plus') && lower.includes('2021')) return 'Microsoft Office Professional Plus 2021';
        if (lower.includes('professional plus') && lower.includes('2019')) return 'Microsoft Office Professional Plus 2019';
        if (lower.includes('professional plus') && lower.includes('2016')) return 'Microsoft Office Professional Plus 2016';
        if (lower.includes('standard') && lower.includes('2021')) return 'Microsoft Office Standard 2021';
        if (lower.includes('standard') && lower.includes('2019')) return 'Microsoft Office Standard 2019';
        if (lower.includes('standard') && lower.includes('2016')) return 'Microsoft Office Standard 2016';
        if (lower.includes('365 apps for business')) return 'Microsoft 365 Apps for business';
        if (lower.includes('365 apps for enterprise')) return 'Microsoft 365 Apps for enterprise';
        if (lower.includes('365') || lower.includes('copilot')) return 'Microsoft 365';
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
        
        const isOffice = msOfficeKeywords.some(kw => lowerName.includes(kw)) && !isOfficeJunk(app.name);
        const isAntivirus = antivirusKeywords.some(kw => lowerName.includes(kw));

        if (isOffice) {
          detectedOffice.add(normalizeOffice(app.name));
        }
        if (isAntivirus) {
          detectedAntivirus.add(normalizeAntivirus(app.name));
        }
      }

      if (detectedOffice.size > 0) {
        // If there are multiple, try to filter out generic 'Microsoft 365' if a specific one exists
        let officeArray = Array.from(detectedOffice);
        if (officeArray.length > 1) {
            const specificOffices = officeArray.filter(o => o !== 'Microsoft 365' && !o.includes('Copilot'));
            if (specificOffices.length > 0) {
                officeArray = specificOffices;
            }
        }
        msOffice = officeArray.join(', ');
      }
      if (detectedAntivirus.size > 0) {
        antivirus = Array.from(detectedAntivirus).join(', ');
      }
    }

    // 10. Fetch connected monitors (Computer_Item relations where itemtype === 'Monitor')
    const linkedMonitors: any[] = [];
    try {
      const links = await glpiFetchList(`${GLPI_BASE_URL}/Computer/${computerId}/Computer_Item`);
      if (links && Array.isArray(links)) {
        const monitorLinks = links.filter((l: any) => l.itemtype === 'Monitor');
        for (const mLink of monitorLinks) {
          const monitorId = mLink.items_id;
          const monitor = await glpiFetch(`${GLPI_BASE_URL}/Monitor/${monitorId}?expand_dropdowns=true`) as any;
          if (monitor) {
            let mBrand = '';
            const manufLink = monitor.links?.find((l: any) => l.rel === 'Manufacturer');
            if (manufLink) {
              const manuf = await glpiFetch(manufLink.href) as any;
              if (manuf) mBrand = manuf.name || '';
            }

            let mModel = '';
            const modelLink = monitor.links?.find((l: any) => l.rel === 'MonitorModel');
            if (modelLink) {
              const mdl = await glpiFetch(modelLink.href) as any;
              if (mdl) mModel = mdl.name || '';
            }

            const mSerial = (monitor.serial || '').trim();
            const existing = mSerial
              ? await prisma.asset.findUnique({
                  where: { serialNo: mSerial }
                })
              : null;

            const portsList = [];
            if (monitor.have_hdmi === 1) portsList.push('HDMI');
            if (monitor.have_displayport === 1) portsList.push('DisplayPort');
            if (monitor.have_subd === 1) portsList.push('VGA');
            if (monitor.have_dvi === 1) portsList.push('DVI');

            linkedMonitors.push({
              _assetId: existing ? existing.id : null,
              // ส่งเป็นคนละช่อง ไม่ประกอบเป็น `ชื่อ / รหัส` อีกต่อไป — จอในทะเบียน
              // 109 จาก 212 ตัวไม่มี assetCode การ interpolate จึงได้คำว่า "null"
              // ติดมาในสตริง แล้วฝั่งบันทึกตัดเอาท่อนหลังไปเขียนลงฐานข้อมูลตรง ๆ
              assetName: existing ? existing.assetName : null,
              assetCode: existing ? existing.assetCode : null,
              /** ชื่อที่ GLPI ตั้งให้เอง ใช้ได้แค่เป็นข้อมูลประกอบ ไม่ใช่รหัสทรัพย์สิน */
              glpiName: monitor.name || monitor.otherserial || '',
              brand: mBrand || (existing ? existing.brand : ''),
              model: mModel || (existing ? existing.model : ''),
              serial: mSerial,
              source: 'glpi',
              // จอที่ยังไม่มีในทะเบียนให้ตกเป็นบริษัทของเครื่องที่มันเสียบอยู่
              company: existing ? existing.company : (hostCompany || null),
              screenSize: parseFloat(monitor.size) > 0 ? `${parseFloat(monitor.size)}"` : null,
              ports: portsList.length > 0 ? portsList.join(', ') : null,
              hasSpeaker: monitor.have_speaker === 1
            });
          }
        }
      }
      // เดิมตรงนี้มี fallback: ถ้าไม่พบจอที่ผูกกับเครื่อง ให้เอา contact ของเครื่อง
      // มาตัดที่ @ แล้วค้นจอที่ช่อง contact "มีคำนั้นอยู่ข้างใน" — ถอดออกแล้ว
      //
      // มันเดาผิดเป็นกอบเป็นกำ: HQ-PS-N046 มี contact = "IT@HQ-PS-N046" จึงค้น
      // ด้วยคำว่า "IT" แล้วแมตช์จอ 60 ตัวจากชื่อไทยที่บังเอิญมี it อยู่ข้างใน
      // (Thitichaya, krittiya, nittaya) เครื่องที่ GLPI ผูกจอไว้ 0 ตัวเลยได้จอ
      // ติดมา 20 ตัวจากคนละบริษัท และถ้าช่างกดบันทึก PM จอทั้ง 20 จะโดนเขียนทับ
      // ทั้งผู้ครอบครอง สถานที่ แผนก และสถานะ ให้กลายเป็นของเครื่องนี้
      //
      // Computer_Item คือแหล่งเดียวที่รู้จริงว่าจอเสียบอยู่กับเครื่องไหน ทั้งกอง
      // มีลิงก์อยู่ 246 เส้นบน 231 เครื่อง สูงสุด 2 จอต่อเครื่อง — ไม่มีจอก็คือ
      // ไม่มีจอ ปล่อยให้ว่างแล้วให้ช่างกรอกเองถูกกว่าเดา
    } catch (err) {
      console.error('Error fetching linked monitors from GLPI:', err);
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
      brand: brand || '',
      model: model || '',
      cpu: cpuName ? `${cpuName} (${cpuCores} Cores)` : '',
      ram: totalRamGb ? `${totalRamGb} GB` : '',
      ramSlot1: ramSlot1 || '',
      ramSlot2: ramSlot2 || '',
      os: osName ? `${osName} ${osVersion}`.trim() : '',
      osType: osType || '',
      license: osLicense,
      msOffice: msOffice || '',
      antivirus: antivirus || '',
      user: glpiUser || '',
      storage1: storage1 || '',
      storage2: storage2 || '',
      gpu: gpu || '',
      ipAddress: ipAddress || '',
      macAddress: macAddress || '',
      location: glpiLocation || '',
      domainName: glpiDomain || '',
      monitors: linkedMonitors,
    };
  } catch (error) {
    console.error('Error fetching GLPI spec:', error);
    return null;
  }
}
