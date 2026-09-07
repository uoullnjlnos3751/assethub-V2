# InvGate Asset Management (waddles.is.cloud.invgate.net) - Menu Exploration

Left sidebar top-level icons (in order):
1. Home (globe icon) -> /#/home/dashboard
2. Assets (laptop icon) -> /#/assets/explorer
3. Software (disk icon) -> /#/software/explorer
4. Contracts (badge icon) -> /#/contracts/explorer
5. Procurement (cart/truck icon) -> /#/procurement/purchase-orders
6. Business (database icon) -> /#/business/explorer
7. Others (box icon) -> /#/others
8. Global Activities (clock/history icon) -> /#/global-activities/explorer
9. Smart Recommendations (sparkle icon) -> /#/smart-recommendations
10. Settings (gear icon) -> /#/settings/index
11. Service Management link (icon at bottom "SM") -> https://waddles.sd.cloud.invgate.net (separate product: InvGate Service Desk)

## 2. Assets
Sub-tabs (3): 
- Assets (explorer, list of physical/logical CIs; view = "All Assets" predefined)
- Cloud Assets (explorer for cloud resources; view = "All Cloud Assets" predefined)
- Discovery (list of discovered devices via network scan, columns: Name/Status/Type/IP/MAC/Manufacturer/Model/Serial/Source type/Discovery source/Annotations/Last reported)

Toolbar common to explorer views: hamburger (list/switch saved views), + (new view), filter, save, reload, cards view, full screen, side panel, options (⋮)
"NEW CI" dropdown -> also has "Import CIs" (create/update CIs via file import)
Tags icon (top right, next to New CI) -> global Tag manager: Smart tags (auto, e.g. by Manufacturer/Location) + Manual tags (Employee/Manager), with "Manage tags" and "New tag"

## 3. Software
Sub-tabs (8):
- Software (explorer, list of all software installations; columns: Software Name, Market Version, Reported Version, Manufacturer, Asset Name, Policy name, Authorization, Location)
- Cloud software (explorer)
- Application services (explorer)
- Application services discovery
- Operating system updates (explorer)
- Deployment -> has sub-tabs: Plans (deployment plans: name, status, type Recurring/Single execution, assets count, packages count, execution window, tags, last update), Packages (software packages for deployment)
- Databases (explorer)
- Authorization policies -> policy list (Banned software / Allowed software / Software under review by default) w/ status, affected/excluded installations, last execution, "Execute policies" action, settings gear

## 4. Contracts
Sub-tabs (2): Contracts (explorer: Contract type, Status, Owner, Licensee type, Total/Assigned/Available licenses, Software type), Software Compliance (explorer)

## 5. Procurement
Sub-tabs (2): Purchase Orders (BETA) (PO#, type, creation/expected/delivered dates, ship method, billing address, status, subtotal, freight, handling), Vendors (explorer)

## 6. Business (sidebar tooltip = "CMDB")
Single explorer view "All Business Applications" (Name, Owner, Location, Created on, Last updated, Total CIs, Total Relationships, Tags, Requests Open/Closed)

## 7. Others (sidebar tooltip = "Other CIs")
Sub-tabs (4): People (user directory: Name/Email/Type/Role/Username/Location/Company), Locations (explorer), Vendors (explorer), Cost centers (BETA)

## 8. Global Activities (sidebar tooltip = "Activities")
Single view "All Activities" - audit log of all changes/events across CIs (Type, Date, Event, CI, Before, After, Description, Author, Priority). 967 activities in this trial data.

## 9. Smart Recommendations (sidebar tooltip = "Recommendations")
AI-driven recommendations panel (search + filter/sort). Empty in this trial (no data yet).

## 10. Settings (เมนูใหญ่สุด — 10 หมวดหลัก, แต่ละหมวดมี Sub-menu ด้านขวา)

**10.1 General**
- Preferences (interface design Classic/Veil, company name, attachment file size, ฯลฯ)
- Locations (manage locations for CIs)
- Tags (customize tags to classify CIs)
- Documents (manage templates for document creation)

**10.2 Users**
- Users (create/import/manage users; sub-tabs: All/Technicians/Users)
- Authentication (authentication & registration options)
- Directory services (import users, manage directory services e.g. AD/LDAP/SSO)
- Permissions (manage roles and permissions)

**10.3 CIs**
- General (assets general config: geolocation, duplicate detection, auto merge, auto owner assignment)
- Fields (customize CI fields)
- Asset Types (customize asset types/categories)
- Health (rules to evaluate specific conditions in assets)
- Lifecycle (customize lifecycle status of assets)
- Inventory ID (customize inventory ID templates)
- Automations (rules to execute actions based on events)
- Software metering (metered software titles & devices)
- Depreciation (customize asset depreciation)

**10.4 Software Deployment**
- Preferences (system concurrency limit, retry interval, exclude tags)
- Security controls (security settings for software deployment)
- Shared drives (manage shared drives for installers)

**10.5 Discovery**
- Agent deployment (deploy agent: OS, method Manual/GPO/Remote via Proxy, proxy/server, installation type)
- Proxies (manage proxy servers)
- Discovery sources (integrate services/configure processes to discover assets)
- SNMP Profiles (customize info collected from network devices)
- Printers (manage printers detected by agent/USB)

**10.6 Tasks**
- Tasks (monitor/manage background deployment tasks)

**10.7 Email**
- Outgoing email (SMTP server & options)

**10.8 AI Hub (BETA)**
- AI services (select AI provider, currently "InvGate AI Service")
- Features toggles: OS Updates summaries, Smart Recommendations, Smart search, (more below fold)

**10.9 Integrations**
- Service Management (ITSM integrations: InvGate Service Management [enabled], Jira, ServiceNow, Zendesk)
- API (manage API access credentials)
- Remote Desktop (manage remote desktop compatible applications)
- Warranty APIs (integrate 3rd-party APIs to sync assets' warranty info)

**10.10 System**
- System (product name "InvGate Asset Management", version v3.20, Demo Mode status, subscription info)
- Privacy (GDPR compliance settings)
- Events (log of admin events)

## 1. Home / Dashboard
- Predefined dashboards (via hamburger menu top-left of widget area):
  - CI status (default) - metrics/indicators from multiple CIs. Cards: Assets, Software, Contracts, Business Applications counts; widgets: Security Compliance (donut), Assets Geolocation (map)
  - Operating system updates - metrics on status of OS updates
- "+" button to add new custom dashboard
- Top toolbar per dashboard: download/export, filter, full screen
