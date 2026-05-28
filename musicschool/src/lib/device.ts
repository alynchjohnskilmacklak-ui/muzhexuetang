export function parseUserAgent(ua: string): {
  device: string
  os: string
  browser: string
} {
  if (!ua) return { device: '未知设备', os: '未知系统', browser: '未知浏览器' }

  let os = '未知系统'
  if (ua.includes('iPhone')) os = 'iPhone'
  else if (ua.includes('iPad')) os = 'iPad'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('Windows NT 10')) os = 'Windows 10/11'
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'

  let browser = '未知浏览器'
  if (ua.includes('MicroMessenger')) browser = '微信内置浏览器'
  else if (ua.includes('UCBrowser')) browser = 'UC浏览器'
  else if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('OPR/')) browser = 'Opera'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/') && ua.includes('Version/')) browser = 'Safari'

  let device = '电脑'
  if (ua.includes('iPhone') || (ua.includes('Android') && ua.includes('Mobile'))) {
    device = '手机'
  } else if (ua.includes('iPad') || (ua.includes('Android') && !ua.includes('Mobile'))) {
    device = '平板'
  }

  return {
    device: `${device} · ${browser}`,
    os,
    browser,
  }
}
