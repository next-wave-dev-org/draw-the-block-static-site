// "Update Shop" button — a custom Decap widget, not a real content field.
//
// Products live in Shopify and are baked into the site at build time
// (src/lib/shopify.ts), so Shopify-side changes need a Netlify rebuild to
// show up live. This widget renders a single button that POSTs to
// /api/trigger-deploy (an Astro server endpoint that holds the actual
// Netlify build hook URL server-side — the hook URL never reaches this
// public admin JS). The request carries the logged-in user's Netlify
// Identity JWT; the endpoint rejects anything without a valid one. The click is a pure fetch; it does not touch the
// entry's saved value, so the client never needs to hit Save/Publish.
//
// Uses Decap's global `h`/`createClass` helpers, same convention as
// preview-templates.js — no build step, deferred/polled registration
// because decap-cms.js doesn't guarantee those globals exist the instant
// its own <script> tag finishes executing.
(function () {
  // The logged-in user's Netlify Identity JWT. This admin page doesn't load the
  // Identity widget (so window.netlifyIdentity is normally undefined) — Decap's
  // built-in login (gotrue-js) persists the session in localStorage instead, and
  // refreshes the token whenever the CMS loads or saves anything. Prefer the
  // widget if it's ever added.
  function getIdentityToken() {
    var widgetUser = window.netlifyIdentity && window.netlifyIdentity.currentUser
      ? window.netlifyIdentity.currentUser()
      : null;
    if (widgetUser) return widgetUser.jwt();

    try {
      var saved = JSON.parse(window.localStorage.getItem('gotrue.user') || 'null');
      var token = saved && saved.token;
      if (token && token.access_token) {
        // expires_at is ms since epoch; treat <1 min left as expired (same margin gotrue-js uses).
        if (token.expires_at && token.expires_at - 60000 < Date.now()) {
          return Promise.reject(new Error('login expired — reload the CMS and try again'));
        }
        return Promise.resolve(token.access_token);
      }
    } catch (e) {
      /* fall through */
    }
    return Promise.reject(new Error('not logged in — please log in again'));
  }

  function registerDeployTriggerWidget() {
    if (
      typeof createClass !== 'function' ||
      typeof h !== 'function' ||
      typeof window.CMS === 'undefined' ||
      typeof CMS.registerWidget !== 'function'
    ) {
      setTimeout(registerDeployTriggerWidget, 50);
      return;
    }

    var DeployTriggerControl = createClass({
      getInitialState: function () {
        return { status: 'idle', message: '' };
      },

      handleClick: function () {
        var self = this;
        self.setState({ status: 'loading', message: '' });

        // The endpoint only accepts logged-in CMS users: send their Netlify Identity JWT.
        var tokenPromise = getIdentityToken();

        tokenPromise
          .then(function (token) {
            return fetch('/api/trigger-deploy', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + token },
            });
          })
          .then(function (res) {
            return res.json().catch(function () {
              return {};
            }).then(function (data) {
              if (!res.ok || !data.ok) {
                throw new Error((data && data.error) || ('HTTP ' + res.status));
              }
            });
          })
          .then(function () {
            self.setState({
              status: 'success',
              message: 'Update triggered! Give it about 1–2 minutes, then check the Shop page.',
            });
          })
          .catch(function (err) {
            self.setState({
              status: 'error',
              message: 'Something went wrong (' + err.message + '). Try again, or let your developer know if it keeps failing.',
            });
          });
      },

      render: function () {
        var status = this.state.status;
        var isLoading = status === 'loading';

        return h(
          'div',
          { id: this.props.forID, className: this.props.classNameWrapper },
          h(
            'button',
            {
              type: 'button',
              onClick: this.handleClick,
              disabled: isLoading,
              style: {
                fontFamily: 'sans-serif',
                fontSize: '15px',
                fontWeight: 'bold',
                padding: '12px 24px',
                background: isLoading ? '#999' : '#111',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'default' : 'pointer',
              },
            },
            isLoading ? 'Updating…' : 'Update Shop Now'
          ),
          status === 'success'
            ? h('p', { style: { color: '#1a7f37', fontFamily: 'sans-serif', fontSize: '13px', marginTop: '8px' } }, this.state.message)
            : null,
          status === 'error'
            ? h('p', { style: { color: '#c00', fontFamily: 'sans-serif', fontSize: '13px', marginTop: '8px' } }, this.state.message)
            : null
        );
      },
    });

    CMS.registerWidget('deployTrigger', DeployTriggerControl);
  }

  registerDeployTriggerWidget();
})();
