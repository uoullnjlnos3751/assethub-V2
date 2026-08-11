import { prisma } from '../lib/prisma';
import ldap from 'ldapjs';

const LDAP_HOST = process.env.LDAP_HOST || 'SRV-ADDS-02.trrgroup.com';
const LDAP_PORT = parseInt(process.env.LDAP_PORT || '389');
const LDAP_BASE_DN = process.env.LDAP_BASE_DN || 'dc=trrgroup,dc=com';
const LDAP_SEARCH_USER = process.env.LDAP_SEARCH_USER || 'watchara.kid';
const LDAP_SEARCH_PASSWORD = process.env.LDAP_SEARCH_PASSWORD || '';

export async function syncMasterDataFromIntraTools() {
  return new Promise((resolve, reject) => {
    try {
      console.log('Fetching master data from AD LDAP...');
      
      const client = ldap.createClient({
        url: `ldap://${LDAP_HOST}:${LDAP_PORT}`,
        timeout: 10000,
        connectTimeout: 10000,
      });

      const bindUser = LDAP_SEARCH_USER.includes('@') ? LDAP_SEARCH_USER : `${LDAP_SEARCH_USER}@trrgroup.com`;

      client.bind(bindUser, LDAP_SEARCH_PASSWORD, (err) => {
        if (err) {
          console.error('LDAP Bind error:', err);
          client.unbind();
          return reject(new Error('เชื่อมต่อ LDAP ไม่สำเร็จ: ' + err.message));
        }

        const searchOptions: ldap.SearchOptions = {
          filter: '(&(objectCategory=person)(objectClass=user)(company=*))',
          scope: 'sub',
          attributes: ['company', 'department'],
          paged: true,
          sizeLimit: 1000
        };

        client.search(LDAP_BASE_DN, searchOptions, (err: any, res: any) => {
          if (err) {
            client.unbind();
            return reject(new Error('ค้นหา LDAP ไม่สำเร็จ: ' + err.message));
          }

          const companiesMap = new Map();
          const departmentsMap = new Map();

          res.on('searchEntry', (entry: any) => {
            const obj = entry.object;
            
            if (obj.company) {
              const compName = Array.isArray(obj.company) ? obj.company[0] : obj.company;
              companiesMap.set(compName, {
                code: null,
                name: compName,
                nameEng: null
              });
            }
            
            if (obj.department) {
              const deptName = Array.isArray(obj.department) ? obj.department[0] : obj.department;
              departmentsMap.set(deptName, {
                code: null,
                name: deptName,
                nameEng: null
              });
            }
          });

          res.on('error', (err: any) => {
            console.error('LDAP Search stream error:', err);
          });

          res.on('end', async (result: any) => {
            client.unbind();
            
            try {
              let addedCompanyCount = 0;
              let updatedCompanyCount = 0;
              
              for (const comp of companiesMap.values()) {
                const existingByName = await prisma.company.findFirst({ where: { name: comp.name } });
                if (existingByName) {
                  // don't overwrite manual codes/eng names
                  await prisma.company.update({
                    where: { id: existingByName.id },
                    data: { isActive: true }
                  });
                  updatedCompanyCount++;
                } else {
                  await prisma.company.create({
                    data: {
                      name: comp.name,
                      isActive: true,
                    }
                  });
                  addedCompanyCount++;
                }
              }

              let addedDeptCount = 0;
              let updatedDeptCount = 0;
              
              for (const dept of departmentsMap.values()) {
                const existingByName = await prisma.department.findFirst({ where: { name: dept.name } });
                if (existingByName) {
                  updatedDeptCount++;
                } else {
                  const uniqueCode = 'DPT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
                  await prisma.department.create({
                    data: { name: dept.name, code: uniqueCode }
                  });
                  addedDeptCount++;
                }
              }

              resolve({
                success: true,
                company: { added: addedCompanyCount, updated: updatedCompanyCount },
                department: { added: addedDeptCount, updated: updatedDeptCount },
              });
            } catch (dbErr: any) {
              reject(new Error('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + dbErr.message));
            }
          });
        });
      });
    } catch (error: any) {
      console.error('Error syncing from LDAP:', error.message);
      reject(new Error('ไม่สามารถดึงข้อมูลจาก LDAP ได้: ' + error.message));
    }
  });
}
