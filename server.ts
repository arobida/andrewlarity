const indexHtml = Bun.file("./index.html");

Bun.serve({
  fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Serve index.html for root
    if (pathname === "/") {
      return new Response(indexHtml, {
        headers: { "Content-Type": "text/html" }
      });
    }

    // Serve static files
    if (pathname === "/styles.css") {
      const file = Bun.file("./styles.css");
      return new Response(file, {
        headers: { "Content-Type": "text/css" }
      });
    }

    if (pathname === "/frontend.js") {
      const file = Bun.file("./frontend.js");
      return new Response(file, {
        headers: { "Content-Type": "application/javascript" }
      });
    }

    return new Response("Not Found", { status: 404 });
  },
  development: {
    hmr: true,
    console: true,
  },
  port: 3000,
});

console.log("Server running at http://localhost:3000");
