// Live preview for the "Header Banner" entry (pageContent/logo-backdrop.json) —
// mirrors BaseLayout.astro's banner CSS (aspect-ratio 5.45, bottom fade,
// CMS-driven logo size/position) so editors see the composite before
// publishing. Uses Decap's global `h`/`createClass` helpers — no build
// step, matches the rest of this admin setup.
//
// Kept as an external file (not inlined in index.html) — Astro's dev
// server rewrites HTML responses for browser navigations (injecting its
// dev toolbar) and that rewrite was silently dropping an inline <script>
// block here. External files aren't touched by that transform.
//
// Registration is deferred/polled: decap-cms.js doesn't guarantee
// `createClass`/`h`/`CMS.registerPreviewTemplate` exist the instant its
// own <script> tag finishes executing.
(function () {
  function registerHeaderBannerPreview() {
    if (
      typeof createClass !== 'function' ||
      typeof h !== 'function' ||
      typeof window.CMS === 'undefined' ||
      typeof CMS.registerPreviewTemplate !== 'function'
    ) {
      setTimeout(registerHeaderBannerPreview, 50);
      return;
    }

    var HeaderBannerPreview = createClass({
      render: function () {
        var data = this.props.entry.get('data');

        var backdropMode = data.get('backdropMode') || 'none';
        var backdropImagePath = data.get('backdropImage');
        var backdropVerticalPosition = data.get('backdropVerticalPosition');
        if (backdropVerticalPosition === undefined || backdropVerticalPosition === null || backdropVerticalPosition === '') {
          backdropVerticalPosition = 50;
        }

        var logoMode = data.get('logoMode') || 'default';
        var logoImagePath = data.get('logoImage');
        var logoSizePercent = data.get('logoSizePercent');
        if (logoSizePercent === undefined || logoSizePercent === null || logoSizePercent === '') {
          logoSizePercent = 75;
        }
        var logoPositionPercent = data.get('logoPositionPercent');
        if (logoPositionPercent === undefined || logoPositionPercent === null || logoPositionPercent === '') {
          logoPositionPercent = 50;
        }

        var backdropUrl = null;
        if (backdropMode === 'image' && backdropImagePath) {
          backdropUrl = this.props.getAsset(backdropImagePath).toString();
        }

        var logoUrl = null;
        if (logoMode === 'custom') {
          logoUrl = logoImagePath ? this.props.getAsset(logoImagePath).toString() : '/images/logo-default.png';
        } else if (logoMode === 'default') {
          logoUrl = '/images/logo-default.png';
        }

        var bannerStyle = {
          position: 'relative',
          width: '100%',
          aspectRatio: '5.45',
          background: backdropUrl
            ? 'url(' + backdropUrl + ') center ' + backdropVerticalPosition + '% / cover no-repeat, #000'
            : '#000',
          overflow: 'hidden',
        };

        var fadeStyle = {
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 75%, #000 100%)',
          pointerEvents: 'none',
        };

        var logoStyle = {
          position: 'absolute',
          top: '50%',
          left: logoPositionPercent + '%',
          transform: 'translate(-' + logoPositionPercent + '%, -50%)',
          maxHeight: logoSizePercent + '%',
          maxWidth: '240px',
          height: 'auto',
          width: 'auto',
        };

        return h('div', { style: { padding: '16px', background: '#f5f5f5' } },
          h('p', { style: { fontFamily: 'sans-serif', fontSize: '13px', color: '#555', marginBottom: '8px' } },
            "Live preview — approximate. The real site's banner spans the full page-column width at each screen size; this preview uses a fixed width."
          ),
          h('div', { style: bannerStyle },
            h('div', { style: fadeStyle }),
            logoUrl ? h('img', { src: logoUrl, style: logoStyle }) : null
          )
        );
      }
    });

    CMS.registerPreviewTemplate('logoBackdrop', HeaderBannerPreview);
  }

  registerHeaderBannerPreview();
})();
