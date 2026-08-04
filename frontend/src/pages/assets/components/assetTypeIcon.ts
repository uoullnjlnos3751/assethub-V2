import type React from 'react';
import ComputerIcon from '@mui/icons-material/Computer';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import PrintIcon from '@mui/icons-material/Print';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RouterIcon from '@mui/icons-material/Router';
import DnsIcon from '@mui/icons-material/Dns';
import VideocamIcon from '@mui/icons-material/Videocam';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import HandymanIcon from '@mui/icons-material/Handyman';

/* Matches the icon set used on the asset registry list */
export function getTypeIconComponent(type: string): React.ElementType {
  const t = type?.toLowerCase() || '';
  if (t.includes('server')) return DnsIcon;
  if (t.includes('monitor')) return DesktopWindowsIcon;
  if (t.includes('printer')) return PrintIcon;
  if (['phone', 'tablet', 'smartphone', 'ipad'].some(k => t.includes(k))) return PhoneAndroidIcon;
  if (['switch', 'router', 'firewall', 'access point', 'ap', 'network'].some(k => t.includes(k))) return RouterIcon;
  if (t.includes('projector')) return VideocamIcon;
  if (t.includes('webcam')) return CameraAltIcon;
  if (t.includes('speaker')) return VolumeUpIcon;
  if (['notebook', 'laptop', 'macbook', 'desktop', 'pc', 'workstation', 'all-in-one'].some(k => t.includes(k))) return ComputerIcon;
  return HandymanIcon;
}
