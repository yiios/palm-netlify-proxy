import { Context } from "@netlify/edge-functions";

const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
  const picked = new Headers();
  for (const key of headers.keys()) {
    if (keys.some((k) => (typeof k === "string" ? k === key : k.test(key)))) {
      const value = headers.get(key);
      if (typeof value === "string") {
        picked.set(key, value);
      }
    }
  }
  return picked;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "*",
  "access-control-allow-headers": "*",
};

export default async (request: Request, context: Context) => {

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS,
    });
  }

  const { pathname, searchParams } = new URL(request.url);
  if(pathname === "/") {
    let blank_html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OpenAI API Proxy on Netlify Edge</title>
</head>
<body>
  <h1 id="openai-api-proxy-on-netlify-edge">OpenAI API Proxy on Netlify Edge</h1>
  <p>Tips: This project uses a reverse proxy to access OpenAI services, bypassing location restrictions or other constraints.</p>
  <p>If you have any of the following requirements, you may need the support of this project:</p>
  <ol>
  <li>When there are restrictions on your use of OpenAI services based on your location</li>
  <li>You want to customize the API usage</li>
  </ol>
  <p>For technical discussions, please visit <a href="https://simonmy.com/posts/使用netlify反向代理openai-api.html">https://simonmy.com/posts/使用netlify反向代理openai-api.html</a></p>
</body>
</html>
    `
    return new Response(blank_html, {
      headers: {
        ...CORS_HEADERS,
        "content-type": "text/html"
      },
    });
  }

  const url = new URL(pathname, "https://api.openai.com/");
  searchParams.delete("_path");

  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const headers = pickHeaders(request.headers, ["content-type", "authorization", "accept-encoding"]);

  const response = await fetch(url, {
    body: request.body,
    method: request.method,
    duplex: 'half',
    headers,
  });

  const responseHeaders = {
    ...CORS_HEADERS,
    ...Object.fromEntries(response.headers),
    "content-encoding": null  // 一般OpenAI的API不会进行内容编码，如果有特殊需求可以调整
  };

  return new Response(response.body, {
    headers: responseHeaders,
    status: response.status
  });
};
