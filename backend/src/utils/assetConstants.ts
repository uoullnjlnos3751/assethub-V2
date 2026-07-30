export const ASSET_TYPE_GROUPS: Record<string, string[]> = {
  computers: ['Computer', 'Notebook', 'PC Desktop', 'Desktop PC', 'Laptop', 'Workstation', 'Macbook', 'Mini PC', 'All-in-One', 'Thin Client'],
  monitors: ['Monitor', 'Monitor มาตรฐาน', 'Monitor Ultrawide', 'Monitor Curved', 'Monitor 4K'],
  devices: ['Device', 'Projector', 'Conference Speaker', 'Webcam', 'Docking Station', 'Presentation Clicker', 'Accessory', 'Peripheral', 'Speaker', 'Dock', 'Mouse', 'Keyboard', 'Microphone', 'Voice Recorder'],
  printers: ['Printer', 'Laser Printer', 'Inkjet Printer', 'Thermal Printer', 'Dot Matrix Printer'],
  phonesTablets: ['Phone', 'Tablet', 'Smartphone', 'Mobile Phone', 'Mobile Hotspot'],
  network: ['Network', 'Network Device', 'Switch', 'Router', 'Firewall', 'Access Point', 'AP', 'Modem'],
  rack: ['Server Rack', 'Server', 'PDU', 'UPS', 'Enclosure'],
};

export const ASSET_STATUS_OPTIONS = new Set([
  'Available',
  'Borrowed',
  'InUse',
  'Maintenance',
  'Retired',
  'Lost',
]);
