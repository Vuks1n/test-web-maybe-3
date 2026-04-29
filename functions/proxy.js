const BACKEND_URL = Netlify.env.get("BACKEND_URL") || "https://your-backend-server.com";

function getWelcomePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome</title>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  background-color: #000000;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  overflow: hidden;
}
.container {
  text-align: center;
  padding: 20px;
}
h1 {
  font-size: 3.5rem;
  font-weight: 300;
  letter-spacing: 2px;
  margin-bottom: 40px;
  animation: fadeIn 0.8s ease-in;
}
button {
  background-color: #1a1a1a;
  color: #ffffff;
  border: 1px solid #333333;
  padding: 14px 40px;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s ease;
  letter-spacing: 1px;
}
button:hover {
  background-color: #2a2a2a;
  border-color: #555555;
}
button:active {
  background-color: #1a1a1a;
  transform: scale(0.98);
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
</head>
<body>
<div class="container">
<h1>Welcome</h1>
<button onclick="handleClick()">Enter</button>
</div>
<script>
function handleClick() {
  window.location.href = '?rq=true';
}
</script>
</body>
</html>`;
}

function getComingSoonPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Coming Soon</title>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  background-color: #000000;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  overflow: hidden;
}
.container {
  text-align: center;
  padding: 20px;
}
h1 {
  font-size: 3.5rem;
  font-weight: 300;
  letter-spacing: 2px;
  animation: fadeIn 0.8s ease-in;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
</head>
<body>
<div class="container">
<h1>Coming Soon</h1>
</div>
</body>
</html>`;
}

async function proxyRequest(request, targetPath = null) {
  const url = new URL(request.url);
  const path = targetPath || url.pathname + url.search;
  const upstreamUrl = new URL(path, BACKEND_URL).toString();

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("x-forwarded-proto");
  headers.delete("x-forwarded-host");

  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: "manual",
  });

  const upstreamResponse = await fetch(upstreamRequest);

  const responseHeaders = new Headers();
  for (const [key, value] of upstreamResponse.headers.entries()) {
    if (!["transfer-encoding", "connection", "keep-alive"].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export default async function handler(request, context) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const params = new URLSearchParams(url.search);
    const rq = params.get('rq');

    if (pathname === "/" && request.method === "GET") {
      if (rq === 'true') {
        return new Response(getComingSoonPage(), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return new Response(getWelcomePage(), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    if (pathname === "/api/main" && request.method === "POST") {
      return await proxyRequest(request, "/");
    }

    if (pathname === "/api/genuine" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const mergedRequest = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify({ ...body, _merged: true })
      });
      return await proxyRequest(mergedRequest, "/api/genuine");
    }

    return await proxyRequest(request);
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
