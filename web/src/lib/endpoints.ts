const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const joinUrl = (base: string, path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimTrailingSlash(base)}${normalizedPath}`;
};

export const apiBase = () => {
  if (window.location.port === '5173') {
    return `http://${window.location.hostname}:8000`;
  }
  return '';
};

export const apiUrl = (path: string) => joinUrl(apiBase(), path);

export const go2rtcBase = () => {
  const override = localStorage.getItem('mview_go2rtc_base');
  if (override) return override;
  return apiUrl('/go2rtc');
};

export const go2rtcUrl = (path: string) => joinUrl(go2rtcBase(), path);
