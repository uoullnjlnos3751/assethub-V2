# Run this in an elevated (Administrator) PowerShell window.
# Purpose: make PM2-Resurrect-AssetHub survive reboot even without an
# interactive console logon (e.g. RDP disconnect), using S4U logon so no
# password needs to be stored.

$action = New-ScheduledTaskAction -Execute "C:\Users\VM-Watchara.kid\pm2-resurrect.bat"
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User "VM-JACK-01\VM-Watchara.kid"
$triggerBoot = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "VM-Watchara.kid" -LogonType S4U -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Set-ScheduledTask -TaskName "PM2-Resurrect-AssetHub" -Action $action -Trigger @($triggerLogon, $triggerBoot) -Principal $principal -Settings $settings

Write-Output "--- Updated task ---"
Get-ScheduledTask -TaskName "PM2-Resurrect-AssetHub" | Format-List TaskName, State
(Get-ScheduledTask -TaskName "PM2-Resurrect-AssetHub").Triggers | Format-Table CimClass -AutoSize
(Get-ScheduledTask -TaskName "PM2-Resurrect-AssetHub").Principal | Format-List UserId, LogonType, RunLevel
