import type { NextConfig } from "next";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";

const nextConfig: NextConfig = {
  output: "export",
  // For GitHub Pages: set basePath to your repo name (e.g., "/varga-analysis")
  // If deploying to https://username.github.io/ (user/org site), leave empty ""
  basePath: process.env.BASE_PATH || (repoName ? `/${repoName}` : ""),
  trailingSlash: true,
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
