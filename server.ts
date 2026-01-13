const indexHtml = Bun.file("./index.html");

Bun.serve({
  fetch(req) {
    if (req.url === "/" || new URL(req.url).pathname === "/") {
      return new Response(indexHtml, {
        headers: { "Content-Type": "text/html" }
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
