const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const http = require("http");
const https = require("https");

// Get the default config
const config = getDefaultConfig(__dirname);

// --- Add SVG transformer ---
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver = {
  ...resolver,
  // Remove 'svg' from assetExts
  assetExts: resolver.assetExts.filter(ext => ext !== "svg"),
  // Add 'svg' to sourceExts so we can import it as a component
  sourceExts: [...resolver.sourceExts, "svg"],
};

const LOCAL_BACKEND_URL = "http://localhost:3000";
const PROXY_PREFIXES = ["/api", "/songs"];

function proxyToBackend(req, res) {
  const targetUrl = new URL(req.url, LOCAL_BACKEND_URL);
  const client = targetUrl.protocol === "https:" ? https : http;

  const proxyReq = client.request(
    targetUrl,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Local backend proxy failed",
        details: error.message,
      })
    );
  });

  req.pipe(proxyReq);
}

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      const requestPath = req.url || "";

      if (PROXY_PREFIXES.some((prefix) => requestPath.startsWith(prefix))) {
        return proxyToBackend(req, res);
      }

      return middleware(req, res, next);
    };
  },
};

// Wrap with NativeWind
module.exports = withNativeWind(config, { input: './global.css' });
