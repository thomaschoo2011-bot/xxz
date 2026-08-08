(function () {
  const measurementId = "G-0VSLRPPCH3";
  if (window.__xuefengAnalyticsLoaded || location.pathname.startsWith("/ht/") || /\/count\.htm$/.test(location.pathname)) return;
  window.__xuefengAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    anonymize_ip: true,
    page_title: document.title,
    page_location: location.href
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
})();
