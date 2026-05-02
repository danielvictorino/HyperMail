const hasStandardCertificate =
  Boolean(process.env.CSC_LINK?.trim()) &&
  Boolean(process.env.CSC_KEY_PASSWORD?.trim());
const hasWindowsCertificate =
  Boolean(process.env.WIN_CSC_LINK?.trim()) &&
  Boolean(process.env.WIN_CSC_KEY_PASSWORD?.trim());

if (!hasStandardCertificate && !hasWindowsCertificate) {
  console.error(
    [
      "Windows release packaging requires code-signing credentials.",
      "Set CSC_LINK and CSC_KEY_PASSWORD, or WIN_CSC_LINK and WIN_CSC_KEY_PASSWORD.",
      "Unsigned Windows auto-update builds are blocked."
    ].join("\n")
  );
  process.exit(1);
}

console.log("Windows code-signing credentials are configured.");
