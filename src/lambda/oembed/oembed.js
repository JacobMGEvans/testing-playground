function incorrectParams(error) {
  return {
    statusCode: 501, // oembed status // 422, // Unprocessable Entity
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error }),
  };
}

function getHostname(event, context) {
  if (event.headers.host) {
    return `https://${event.headers.host}`;
  }

  const { netlify } = context.clientContext.custom || {};

  return JSON.parse(Buffer.from(netlify, 'base64').toString('utf-8')).site_url;
}

const PROVIDER = 'testing-playground.com';
const allowedPathsRegexp = new RegExp(/^\/(gist|embed)\/.*/);

function handler(event, context, callback) {
  const host = getHostname(event, context);

  const params = event.queryStringParameters;
  const { format, referrer, maxwidth = 900, maxheight = 450 } = params;

  if (format && format !== 'json') {
    return callback(
      null,
      incorrectParams('unsupported format, only json is supported'),
    );
  }

  if (!params.url) {
    return callback(
      null,
      incorrectParams('seems like you forgot to provide an url :/'),
    );
  }

  const url = new URL(params.url);

  // verify if the url is supported, basically we only allow localhost if we're
  // running at localhost, and testing-playground.com as host. And either no
  // path or /gist and /embed paths.
  if (
    (!host.includes(url.hostname) && url.hostname !== PROVIDER) ||
    (url.pathname !== '/' && !allowedPathsRegexp.test(url.pathname))
  ) {
    return callback(null, incorrectParams('unsupported url provided :/'));
  }

  // map / and /gist to /embed
  url.pathname =
    url.pathname === '/'
      ? '/embed'
      : url.pathname.replace(/^\/gist\//, '/embed/');

  // set default panes if no panes are provided, KEEP IN SYNC WITH /constants#defaultPanes !
  if (!url.searchParams.has('panes')) {
    url.searchParams.set('panes', 'query,preview');
  }

  callback(null, {
    statusCode: 200,
    body: JSON.stringify(
      {
        version: '1.0',
        type: 'rich',
        success: true,

        provider_name: PROVIDER,
        provider_url: host,

        html: `<iframe src="${url}" height="${maxheight}" width="${maxwidth}" scrolling="no" frameBorder="0" allowTransparency="true" title="Testing Playground" style="overflow: hidden; display: block; width: 100%"></iframe>`,
        width: maxwidth,
        height: maxheight,

        thumbnail_url: `${host}/icon.png`,
        thumbnail_width: 512,
        thumbnail_height: 512,

        referrer,
        cache_age: 3600,
      },
      '',
      '  ',
    ),
  });
}

module.exports = { handler };
